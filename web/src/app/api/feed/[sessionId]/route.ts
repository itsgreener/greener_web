import { NextRequest, NextResponse } from "next/server";
import {
  getFeedSessionBatch,
  FeedSessionNotFoundError,
  InvalidFeedCursorError,
} from "@/modules/feed/application/getFeedSessionBatch";

/**
 * GET /api/feed/{sessionId}?cursor=... (§16.1): siguiente lote real de
 * una sesión de feed ya abierta con POST /api/feed/sessions. `cursor`
 * ausente = primer lote (ronda 0).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const cursor = request.nextUrl.searchParams.get("cursor");

  try {
    const batch = await getFeedSessionBatch(sessionId, cursor);
    return NextResponse.json(batch, {
      // El orden depende de la seed de sesión — igual que en el prototipo
      // demo, nunca cacheable entre sesiones (§6.1).
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof FeedSessionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof InvalidFeedCursorError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error sirviendo el lote del feed:", error);
    return NextResponse.json({ error: "No se pudo servir el lote del feed." }, { status: 500 });
  }
}
