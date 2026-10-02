# Tipografías

Ficheros WOFF2 que carga `src/lib/fonts.ts` con `next/font/local`.

| Fichero                    | Origen                              | Uso                                     |
| -------------------------- | ----------------------------------- | --------------------------------------- |
| `helvetica-neue-400.woff2` | `HelveticaNeueRoman.otf` (peso 400) | Texto general (Regular)                 |
| `helvetica-neue-700.woff2` | `HelveticaNeueBold.otf` (peso 700)  | Texto general (Bold; también el 600)    |
| `kinder-400.woff2`         | `KinderRegular.otf` (peso 400)      | Títulos de caso y de contacto (display) |

## Cómo se generaron

Los OTF originales no están en el repositorio (los de Helvetica Neue pesan ~600 KB cada uno
por traer 2340 glifos). Se convirtieron a WOFF2 y, en Helvetica Neue, se recortó el juego de
caracteres a latino (ASCII, Latin-1, Latin Extended-A, puntuación tipográfica, €, ™, flechas
y ✓). Resultado: 615 KB → 31 KB (Regular) y 595 KB → 24 KB (Bold). Kinder se convirtió sin recortar.

```bash
pip install fonttools brotli
U="U+0020-007E,U+00A0-00FF,U+0100-017F,U+0218-021B,U+02C6,U+02DC,U+2010-2015,U+2018-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+20AC,U+2116,U+2122,U+2212,U+2190-2193,U+2713"
pyftsubset HelveticaNeueRoman.otf --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file=helvetica-neue-400.woff2 --name-IDs='*' --notdef-outline --recommended-glyphs
pyftsubset HelveticaNeueBold.otf  --unicodes="$U" --layout-features='*' --flavor=woff2 --output-file=helvetica-neue-700.woff2 --name-IDs='*' --notdef-outline --recommended-glyphs
python3 -c "from fontTools.ttLib import TTFont; f=TTFont('KinderRegular.otf'); f.flavor='woff2'; f.save('kinder-400.woff2')"
```

## Notas

- Si algún día hace falta otro idioma (cirílico, griego…), hay que volver a generar el
  subconjunto con esos rangos.
- Kinder no trae `ŀ` (U+0140, «ela geminada» del catalán) ni `ª º`. El catalán normal usa el
  punto medio `·` (U+00B7), que sí está.
- Kinder solo tiene peso 400: usar siempre la clase global `.text-display`, que fija
  `font-weight: 400` y desactiva la negrita sintética.
- Licencias: los metadatos de los OTF no traen texto de licencia; conviene confirmar que la
  de Helvetica Neue y la de Kinder cubren el uso web (autoalojado).
