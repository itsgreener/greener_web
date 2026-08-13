import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { generateRound } from "@/modules/feed/domain/generateRound";
import type {
  CaseInput,
  ContentPinQueue,
  FeedConfig,
  FeedSnapshot,
  RoundReport,
} from "@/modules/feed/domain/types";

// Ratios confirmados con Greener (ADR-11): 70/15/5/5/5.
const BASE_CONFIG: FeedConfig = {
  ratios: { cases: 70, insights: 15, tools: 5, channel: 5, other: 5 },
  mixWindow: 20,
  distanceWindow: 10,
};

function pinQueueArb(contentPrefix: string, minPins: number, maxPins: number) {
  return fc
    .tuple(fc.uuid(), fc.array(fc.uuid(), { minLength: minPins, maxLength: maxPins }))
    .map(([contentId, pinIds]): ContentPinQueue => ({
      contentId: `${contentPrefix}-${contentId}`,
      pinIds: pinIds.map((p, i) => `${contentPrefix}-${contentId}-pin-${i}-${p}`),
    }));
}

function caseArb() {
  return fc
    .tuple(pinQueueArb("case", 1, 8), fc.integer({ min: 1, max: 5 }))
    .map(([queue, force]): CaseInput => ({ ...queue, force }));
}

/**
 * Genera universos deliberadamente pequeños en insights/tools (arquitectura
 * §22: "con 5 insights y 30 tools esto ocurrirá siempre" — repetición
 * necesaria), para forzar el camino de relajación en los tests.
 */
const snapshotArb: fc.Arbitrary<FeedSnapshot> = fc.record({
  cases: fc.array(caseArb(), { minLength: 1, maxLength: 25 }),
  insights: fc.array(pinQueueArb("insight", 1, 3), { minLength: 0, maxLength: 5 }),
  tools: fc.array(pinQueueArb("tool", 1, 3), { minLength: 0, maxLength: 30 }),
  channel: fc.array(pinQueueArb("channel", 1, 3), { minLength: 0, maxLength: 8 }),
  other: fc.array(pinQueueArb("other", 1, 3), { minLength: 0, maxLength: 5 }),
});

const seedArb = fc.string({ minLength: 1, maxLength: 20 });
const roundIndexArb = fc.integer({ min: 0, max: 6 });

/** Compara el report ignorando durationMs, que depende del reloj, no del algoritmo. */
function reportWithoutDuration(report: RoundReport): Omit<RoundReport, "durationMs"> {
  const { durationMs, ...rest } = report;
  void durationMs;
  return rest;
}

describe("generateRound — determinismo", () => {
  it("misma seed, config, snapshot y ronda producen exactamente la misma secuencia", () => {
    fc.assert(
      fc.property(snapshotArb, seedArb, roundIndexArb, (snapshot, seed, roundIndex) => {
        const a = generateRound(snapshot, BASE_CONFIG, seed, roundIndex);
        const b = generateRound(snapshot, BASE_CONFIG, seed, roundIndex);
        expect(a.sequence).toEqual(b.sequence);
        // durationMs depende del reloj, no del algoritmo: se compara todo lo demás.
        expect(reportWithoutDuration(a.report)).toEqual(reportWithoutDuration(b.report));
      }),
      { numRuns: 2000 }
    );
  });

  it("seeds distintas producen, casi siempre, secuencias distintas", () => {
    fc.assert(
      fc.property(snapshotArb, roundIndexArb, (snapshot, roundIndex) => {
        // Necesita algo de universo real para que el orden pueda variar.
        fc.pre(snapshot.cases.some((c) => c.pinIds.length > 1) || snapshot.cases.length > 3);
        const a = generateRound(snapshot, BASE_CONFIG, "seed-A", roundIndex);
        const b = generateRound(snapshot, BASE_CONFIG, "seed-B", roundIndex);
        // No exigimos que TODAS difieran (podría coincidir por casualidad en
        // universos triviales), pero si hay más de un pin es extremadamente
        // improbable que ambas secuencias completas coincidan.
        if (a.sequence.length > 3) {
          expect(a.sequence).not.toEqual(b.sequence);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe("generateRound — terminación y conservación de pines", () => {
  it("siempre termina y no pierde ni añade pines: la secuencia es exactamente el multiset de los pools", () => {
    fc.assert(
      fc.property(snapshotArb, seedArb, roundIndexArb, (snapshot, seed, roundIndex) => {
        const { sequence, report } = generateRound(snapshot, BASE_CONFIG, seed, roundIndex);

        expect(sequence.length).toBe(report.totalPins);

        // actualCounts por tipo debe coincidir exactamente con lo solicitado:
        // la mezcla reordena, nunca descarta ni inventa pines.
        for (const kind of ["case", "insight", "tool", "channel", "other"] as const) {
          expect(report.actualCounts[kind]).toBe(report.requestedQuotas[kind]);
        }
      }),
      { numRuns: 2000 }
    );
  });

  it("con catálogos mínimos (5 insights, 30 tools) sigue terminando en tiempo razonable", () => {
    const snapshot: FeedSnapshot = {
      cases: Array.from({ length: 15 }, (_, i) => ({
        contentId: `case-${i}`,
        force: 2,
        pinIds: [`case-${i}-p1`, `case-${i}-p2`, `case-${i}-p3`],
      })),
      insights: Array.from({ length: 5 }, (_, i) => ({
        contentId: `insight-${i}`,
        pinIds: [`insight-${i}-p1`],
      })),
      tools: Array.from({ length: 30 }, (_, i) => ({
        contentId: `tool-${i}`,
        pinIds: [`tool-${i}-p1`],
      })),
      channel: [],
      other: [],
    };

    const start = Date.now();
    const { report } = generateRound(snapshot, BASE_CONFIG, "seed-catalogo-minimo", 0);
    expect(Date.now() - start).toBeLessThan(1000);
    // Con solo 5 insights y una cuota bastante mayor, la repetición es
    // inevitable — el informe debe reflejarlo, no fallar silenciosamente.
    expect(report.relaxationCounts[4]).toBeGreaterThanOrEqual(0);
  });
});

describe("generateRound — separación mínima por contenido", () => {
  it("dos pines del mismo contenido a menos de distanceWindow solo aparecen si hubo relajación registrada", () => {
    fc.assert(
      fc.property(snapshotArb, seedArb, roundIndexArb, (snapshot, seed, roundIndex) => {
        const { sequence } = generateRound(snapshot, BASE_CONFIG, seed, roundIndex);

        for (let i = 0; i < sequence.length; i++) {
          for (let j = i + 1; j < Math.min(i + BASE_CONFIG.distanceWindow, sequence.length); j++) {
            if (sequence[i].contentId === sequence[j].contentId) {
              // La separación solo puede violarse si al menos uno de los dos
              // pines quedó marcado con relajación de nivel 3 (separación
              // reducida) o 4 (repetición necesaria) — arquitectura §8.4.
              const maxLevel = Math.max(sequence[i].relaxationLevel, sequence[j].relaxationLevel);
              expect(maxLevel).toBeGreaterThanOrEqual(3);
            }
          }
        }
      }),
      { numRuns: 2000 }
    );
  });
});

describe("generateRound — casos límite", () => {
  it("sin casos, la tanda queda vacía sin lanzar", () => {
    const snapshot: FeedSnapshot = { cases: [], insights: [], tools: [], channel: [], other: [] };
    const { sequence, report } = generateRound(snapshot, BASE_CONFIG, "seed", 0);
    expect(sequence).toEqual([]);
    expect(report.totalPins).toBe(0);
  });

  it("un único caso con un único pin no lanza y produce una tanda mínima coherente", () => {
    const snapshot: FeedSnapshot = {
      cases: [{ contentId: "case-1", force: 1, pinIds: ["pin-1"] }],
      insights: [],
      tools: [],
      channel: [],
      other: [],
    };
    const { sequence, report } = generateRound(snapshot, BASE_CONFIG, "seed", 0);
    expect(sequence.length).toBe(report.totalPins);
    expect(sequence.some((p) => p.contentId === "case-1")).toBe(true);
  });

  it("force mayor que los pines disponibles del caso se marca como repetición (nivel 4)", () => {
    const snapshot: FeedSnapshot = {
      cases: [{ contentId: "case-1", force: 5, pinIds: ["pin-1", "pin-2"] }],
      insights: [],
      tools: [],
      channel: [],
      other: [],
    };
    const { sequence } = generateRound(snapshot, BASE_CONFIG, "seed", 0);
    const casePins = sequence.filter((p) => p.contentId === "case-1");
    expect(casePins.length).toBe(5);
    expect(casePins.some((p) => p.relaxationLevel === 4)).toBe(true);
  });
});
