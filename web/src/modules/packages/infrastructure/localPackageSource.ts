import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PackageManifest, PackageNotFoundError, ResolvedPackage } from "../domain/manifest";

/**
 * Lee un paquete de tool/insight desde fixtures/ en disco.
 *
 * ESTE ARCHIVO ES UN STAND-IN DELIBERADO de Supabase Storage (arquitectura
 * §5, §12.2), usado mientras no hay datos de prueba ni conexión real. Su
 * única responsabilidad es resolver `slug -> ResolvedPackage`; cuando se
 * conecte Storage real, se sustituye por una función con la misma forma
 * que lea de `html_package_version.storage_path` — el route handler que la
 * consume (app/(public)/tools/[slug]) no cambia (arquitectura §24.4).
 */
export async function getLocalPackage(
  kind: "tool" | "insight",
  slug: string
): Promise<ResolvedPackage> {
  const dir = join(process.cwd(), "fixtures", kind === "tool" ? "tools" : "insights", slug);

  let manifestRaw: string;
  let html: string;
  try {
    manifestRaw = await readFile(join(dir, "manifest.json"), "utf-8");
  } catch {
    throw new PackageNotFoundError(slug);
  }

  const manifest = JSON.parse(manifestRaw) as PackageManifest;

  try {
    html = await readFile(join(dir, manifest.entrypoint), "utf-8");
  } catch {
    throw new PackageNotFoundError(slug);
  }

  return { slug, manifest, html };
}

/** Resuelve un asset (CSS/JS/etc.) del mismo paquete, por ruta relativa. */
export async function getLocalPackageAsset(
  kind: "tool" | "insight",
  slug: string,
  assetPath: string[]
): Promise<Buffer> {
  const dir = join(
    process.cwd(),
    "fixtures",
    kind === "tool" ? "tools" : "insights",
    slug,
    "assets"
  );
  const filePath = join(dir, ...assetPath);

  // Protección básica contra path traversal (equivalente ligero a la
  // validación zip-slip de la subida real, arquitectura §12.5).
  if (!filePath.startsWith(dir)) {
    throw new PackageNotFoundError(slug);
  }

  try {
    return await readFile(filePath);
  } catch {
    throw new PackageNotFoundError(slug);
  }
}
