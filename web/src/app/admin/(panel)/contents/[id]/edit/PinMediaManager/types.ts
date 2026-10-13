export type PinMedia = {
  id: string
  kind: 'image' | 'video'
  cloudinaryPublicId: string
}

export type PinMediaManagerProps = {
  pinId: string
  // Tipo del contenido al que pertenece el pin: decide el límite de vídeo
  // (tools: 15 s / 15 MB; el resto: 8 s / 100 MB).
  contentType: string
  // Ratio cerrado del pin, para avisar si el vídeo subido tiene otro.
  pinRatio: string
  media: PinMedia | null
}
