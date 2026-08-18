import { NextRequest, NextResponse } from "next/server";
import { getDemoFeedBatch } from "@/modules/feed/application/getDemoFeedBatch";

const MAX_COUNT = 200; // límite defensivo — el batch real de producción es 40 (§8.1)

/**
 * Endpoint temporal del prototipo de masonry (Fase 1, Anexo E.2). NO es el
 * /api/feed/sessions final de §16.1 — no persiste feed_session/feed_round
 * en Supabase, no firma cursor. Sirve directamente sobre el dataset de
 * demostración (data/demo/feed-snapshot.json) para poder probar fps,
 * virtualización y scroll continuo sin esperar al resto del ABM.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const seed = searchParams.get("seed");
  const offset = Number(searchParams.get("offset") ?? "0");
  const count = Math.min(Number(searchParams.get("count") ?? "40"), MAX_COUNT);

  if (!seed) {
    return NextResponse.json({ error: "Falta el parámetro 'seed'." }, { status: 400 });
  }
  if (!Number.isFinite(offset) || offset < 0) {
    return NextResponse.json({ error: "'offset' debe ser un entero >= 0." }, { status: 400 });
  }
  if (!Number.isFinite(count) || count <= 0) {
    return NextResponse.json({ error: "'count' debe ser un entero > 0." }, { status: 400 });
  }

  try {
    const batch = await getDemoFeedBatch(seed, offset, count);
    return NextResponse.json(batch, {
      headers: { "Cache-Control": "no-store" }, // el orden depende de la seed de sesión (§6.1)
    });
  } catch (error) {
    console.error("Error generando el lote del feed demo:", error);
    return NextResponse.json({ error: "No se pudo generar el lote." }, { status: 500 });
  }
}
