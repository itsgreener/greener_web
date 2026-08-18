import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FeedSnapshot } from "../domain/types";

export interface PinDirectoryEntry {
  contentId: string;
  contentType: "case" | "episode";
  contentTitle: string;
  contentSlug: string;
  ratio: string;
  label: string;
  cta: string | null;
  alt: string;
  cloudinaryPublicId: string;
}

export interface DemoDataset {
  snapshot: FeedSnapshot;
  pinDirectory: Record<string, PinDirectoryEntry>;
}

let cached: DemoDataset | null = null;

/**
 * Lee data/demo/feed-snapshot.json (scripts/generate-demo-data.mjs).
 *
 * STAND-IN DELIBERADO de una consulta real a Supabase (mismo patrón que
 * modules/packages/infrastructure/localPackageSource.ts, §24.4): cuando
 * haya datos reales, esta función se sustituye por una que construya el
 * mismo FeedSnapshot desde content/pin/case_detail, sin tocar el resto.
 */
export async function getDemoSnapshot(): Promise<DemoDataset> {
  if (cached) return cached;

  const path = join(process.cwd(), "data", "demo", "feed-snapshot.json");
  const raw = await readFile(path, "utf-8");
  cached = JSON.parse(raw) as DemoDataset;
  return cached;
}
