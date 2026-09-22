import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock(
  '@/modules/pin/application/createPin',
  () => ({
    createPin: vi.fn(),
  }),
)

vi.mock(
  '@/modules/pin/application/updatePin',
  () => ({
    updatePin: vi.fn(),
  }),
)

vi.mock(
  '@/modules/pin/application/deletePin',
  () => ({
    deletePin: vi.fn(),
  }),
)

vi.mock(
  '@/modules/pin/application/attachPinImage',
  () => ({
    attachPinImage: vi.fn(),
  }),
)

vi.mock(
  '@/modules/pin/application/attachPinVideo',
  () => ({
    attachPinVideo: vi.fn(),
  }),
)

vi.mock(
  '@/modules/pin/application/detachPinMedia',
  () => ({
    detachPinMedia: vi.fn(),
  }),
)

vi.mock(
  '@/modules/media/infrastructure/cloudinaryServer',
  () => {
    class MockCloudinaryImageVerificationError extends Error {
      constructor(message: string) {
        super(message)

        this.name =
          'CloudinaryImageVerificationError'
      }
    }

    return {
      CloudinaryImageVerificationError:
        MockCloudinaryImageVerificationError,

      verifyCloudinaryImageAsset:
        vi.fn(),

      deleteCloudinaryAsset:
        vi.fn(),
    }
  },
)

import {
  createPinAction,
  updatePinAction,
  deletePinAction,
  createPinWithImageAction,
  attachPinImageAction,
  attachPinVideoAction,
  detachPinMediaAction,
} from '@/app/admin/contents/[id]/edit/pinActions'

import {
  createPin,
} from '@/modules/pin/application/createPin'

import {
  updatePin,
} from '@/modules/pin/application/updatePin'

import {
  deletePin,
} from '@/modules/pin/application/deletePin'

import {
  attachPinImage,
} from '@/modules/pin/application/attachPinImage'

import {
  attachPinVideo,
} from '@/modules/pin/application/attachPinVideo'

import {
  detachPinMedia,
} from '@/modules/pin/application/detachPinMedia'

import {
  CloudinaryImageVerificationError,
  deleteCloudinaryAsset,
  verifyCloudinaryImageAsset,
} from '@/modules/media/infrastructure/cloudinaryServer'

const CONTENT_ID =
  '11111111-1111-4111-8111-111111111111'

const PIN_ID =
  '22222222-2222-4222-8222-222222222222'

const MEDIA_ID =
  '33333333-3333-4333-8333-333333333333'

const CLOUDINARY_PUBLIC_ID =
  'greener/content/test-image'

const mockCreatePin =
  vi.mocked(createPin)

const mockUpdatePin =
  vi.mocked(updatePin)

const mockDeletePin =
  vi.mocked(deletePin)

const mockAttachPinImage =
  vi.mocked(attachPinImage)

const mockAttachPinVideo =
  vi.mocked(attachPinVideo)

const mockDetachPinMedia =
  vi.mocked(detachPinMedia)

const mockDeleteCloudinaryAsset =
  vi.mocked(deleteCloudinaryAsset)

const mockVerifyCloudinaryImageAsset =
  vi.mocked(
    verifyCloudinaryImageAsset,
  )

function createValidFormData() {
  const formData =
    new FormData()

  formData.set(
    'ratio',
    '1:1',
  )

  formData.set(
    'showAsCarousel',
    'false',
  )

  formData.set(
    'label',
    'Pin de prueba',
  )

  formData.set(
    'language',
    'es',
  )

  formData.set(
    'autoplayMode',
    '',
  )

  formData.set(
    'speedMs',
    '',
  )

  formData.set(
    'queueOrder',
    '0',
  )

  formData.set(
    'alt',
    'Texto alternativo',
  )

  return formData
}

const VALID_PIN_INPUT = {
  contentId:
    CONTENT_ID,

  ratio:
    '1:1',

  showAsCarousel:
    false,

  label:
    'Pin de prueba',

  language:
    'es',

  autoplayMode:
    null,

  speedMs:
    null,

  queueOrder:
    0,

  alt:
    'Texto alternativo',
}

const VALID_IMAGE_INPUT = {
  pinId:
    PIN_ID,

  cloudinaryPublicId:
    CLOUDINARY_PUBLIC_ID,

  format:
    'jpg',

  width:
    1200,

  height:
    800,

  bytes:
    1024,

  slideOrder:
    0,
}

const VALID_VIDEO_INPUT = {
  pinId:
    PIN_ID,

  cloudinaryPublicId:
    'greener/content/videos/test-video',

  format:
    'mp4',

  width:
    1200,

  height:
    800,

  durationSeconds:
    3,

  bytes:
    1024,

  slideOrder:
    0,
}

const VALID_PIN_WITH_IMAGE = {
  ...VALID_PIN_INPUT,

  cloudinaryPublicId:
    CLOUDINARY_PUBLIC_ID,

  format:
    'jpg',

  width:
    1200,

  height:
    800,

  bytes:
    1024,
}

describe(
  'pinActions',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      mockCreatePin
        .mockResolvedValue(
          PIN_ID,
        )

      mockUpdatePin
        .mockResolvedValue(
          undefined,
        )

      mockDeletePin
        .mockResolvedValue(
          undefined,
        )

      mockAttachPinImage
        .mockResolvedValue(
          MEDIA_ID,
        )

      mockAttachPinVideo
        .mockResolvedValue(
          MEDIA_ID,
        )

      mockDetachPinMedia
        .mockResolvedValue(
          undefined,
        )

      mockDeleteCloudinaryAsset
        .mockResolvedValue(
          undefined,
        )

      mockVerifyCloudinaryImageAsset
        .mockImplementation(
          async (
            publicId,
          ) => ({
            cloudinaryPublicId:
              publicId,

            format:
              'jpg',

            width:
              1200,

            height:
              800,

            bytes:
              1024,
          }),
        )
    })

    describe(
      'createPinAction',
      () => {
        it(
          'con datos válidos, crea y devuelve success',
          async () => {
            const result =
              await createPinAction(
                CONTENT_ID,
                {},
                createValidFormData(),
              )

            expect(
              result,
            ).toEqual({
              success:
                true,
            })

            expect(
              mockCreatePin,
            ).toHaveBeenCalledTimes(
              1,
            )
          },
        )

        it(
          'con alt vacío, no llega a llamar a createPin',
          async () => {
            const formData =
              createValidFormData()

            formData.set(
              'alt',
              '',
            )

            const result =
              await createPinAction(
                CONTENT_ID,
                {},
                formData,
              )

            expect(
              result.fieldErrors,
            ).toBeDefined()

            expect(
              mockCreatePin,
            ).not
              .toHaveBeenCalled()
          },
        )
      },
    )

    describe(
      'updatePinAction',
      () => {
        it(
          'con datos válidos, actualiza y devuelve success',
          async () => {
            const result =
              await updatePinAction(
                PIN_ID,
                CONTENT_ID,
                {},
                createValidFormData(),
              )

            expect(
              result,
            ).toEqual({
              success:
                true,
            })

            expect(
              mockUpdatePin,
            ).toHaveBeenCalledTimes(
              1,
            )
          },
        )

        it(
          'con queueOrder negativo, no llega a llamar a updatePin',
          async () => {
            const formData =
              createValidFormData()

            formData.set(
              'queueOrder',
              '-1',
            )

            const result =
              await updatePinAction(
                PIN_ID,
                CONTENT_ID,
                {},
                formData,
              )

            expect(
              result.fieldErrors,
            ).toBeDefined()

            expect(
              mockUpdatePin,
            ).not
              .toHaveBeenCalled()
          },
        )
      },
    )

    describe(
      'deletePinAction',
      () => {
        it(
          'con un id válido, borra y devuelve success',
          async () => {
            const result =
              await deletePinAction(
                PIN_ID,
                CONTENT_ID,
              )

            expect(
              result,
            ).toEqual({
              success:
                true,
            })

            expect(
              mockDeletePin,
            ).toHaveBeenCalledTimes(
              1,
            )
          },
        )
      },
    )

    describe(
      'createPinWithImageAction',
      () => {
        it(
          'con datos válidos, crea el pin y adjunta la imagen',
          async () => {
            const result =
              await createPinWithImageAction(
                VALID_PIN_WITH_IMAGE,
              )

            expect(
              result,
            ).toEqual({
              ok:
                true,

              pinId:
                PIN_ID,

              mediaId:
                MEDIA_ID,
            })

            expect(
              mockCreatePin,
            ).toHaveBeenCalledTimes(
              1,
            )

            expect(
              mockVerifyCloudinaryImageAsset,
            ).toHaveBeenCalledWith(
              CLOUDINARY_PUBLIC_ID,
            )

            expect(
              mockAttachPinImage,
            ).toHaveBeenCalledWith({
              pinId:
                PIN_ID,

              cloudinaryPublicId:
                CLOUDINARY_PUBLIC_ID,

              format:
                'jpg',

              width:
                1200,

              height:
                800,

              bytes:
                1024,

              slideOrder:
                0,
            })
          },
        )

        it(
          'con datos de pin inválidos, no llega a llamar a createPin',
          async () => {
            const result =
              await createPinWithImageAction({
                ...VALID_PIN_WITH_IMAGE,

                alt:
                  '',
              })

            expect(
              result.ok,
            ).toBe(false)

            expect(
              mockCreatePin,
            ).not
              .toHaveBeenCalled()

            expect(
              mockVerifyCloudinaryImageAsset,
            ).not
              .toHaveBeenCalled()

            expect(
              mockAttachPinImage,
            ).not
              .toHaveBeenCalled()
          },
        )

        it(
          'si createPin falla, no llega a llamar a attachPinImage',
          async () => {
            mockCreatePin
              .mockRejectedValueOnce(
                new Error(
                  'db down',
                ),
              )

            const result =
              await createPinWithImageAction(
                VALID_PIN_WITH_IMAGE,
              )

            expect(
              result.ok,
            ).toBe(false)

            expect(
              mockVerifyCloudinaryImageAsset,
            ).not
              .toHaveBeenCalled()

            expect(
              mockAttachPinImage,
            ).not
              .toHaveBeenCalled()
          },
        )

        it(
          'si el pin se crea pero adjuntar la imagen falla, informa el pinId — el pin no se pierde',
          async () => {
            mockAttachPinImage
              .mockRejectedValueOnce(
                new Error(
                  'fallo al adjuntar',
                ),
              )

            const result =
              await createPinWithImageAction(
                VALID_PIN_WITH_IMAGE,
              )

            expect(
              result,
            ).toEqual({
              ok:
                false,

              pinId:
                PIN_ID,

              error:
                'fallo al adjuntar',
            })
          },
        )

        it(
          'si Cloudinary rechaza la imagen, no la registra en Postgres',
          async () => {
            mockVerifyCloudinaryImageAsset
              .mockRejectedValueOnce(
                new CloudinaryImageVerificationError(
                  'No se permiten archivos GIF.',
                ),
              )

            const result =
              await createPinWithImageAction(
                VALID_PIN_WITH_IMAGE,
              )

            expect(
              result,
            ).toEqual({
              ok:
                false,

              pinId:
                PIN_ID,

              error:
                'No se permiten archivos GIF.',
            })

            expect(
              mockAttachPinImage,
            ).not
              .toHaveBeenCalled()
          },
        )
      },
    )

    describe(
      'attachPinImageAction',
      () => {
        it(
          'con datos válidos, verifica Cloudinary, adjunta y devuelve ok',
          async () => {
            const result =
              await attachPinImageAction(
                VALID_IMAGE_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                true,

              mediaId:
                MEDIA_ID,
            })

            expect(
              mockVerifyCloudinaryImageAsset,
            ).toHaveBeenCalledWith(
              CLOUDINARY_PUBLIC_ID,
            )

            expect(
              mockAttachPinImage,
            ).toHaveBeenCalledWith({
              pinId:
                PIN_ID,

              cloudinaryPublicId:
                CLOUDINARY_PUBLIC_ID,

              format:
                'jpg',

              width:
                1200,

              height:
                800,

              bytes:
                1024,

              slideOrder:
                0,
            })
          },
        )

        it(
          'usa los metadatos verificados de Cloudinary en vez de confiar en los enviados por cliente',
          async () => {
            mockVerifyCloudinaryImageAsset
              .mockResolvedValueOnce({
                cloudinaryPublicId:
                  CLOUDINARY_PUBLIC_ID,

                format:
                  'webp',

                width:
                  2000,

                height:
                  1000,

                bytes:
                  4096,
              })

            const result =
              await attachPinImageAction({
                ...VALID_IMAGE_INPUT,

                format:
                  'png',

                width:
                  10,

                height:
                  10,

                bytes:
                  10,
              })

            expect(
              result.ok,
            ).toBe(true)

            expect(
              mockAttachPinImage,
            ).toHaveBeenCalledWith({
              pinId:
                PIN_ID,

              cloudinaryPublicId:
                CLOUDINARY_PUBLIC_ID,

              format:
                'webp',

              width:
                2000,

              height:
                1000,

              bytes:
                4096,

              slideOrder:
                0,
            })
          },
        )

        it(
          'traduce el error de límite de 8 medios al mensaje del dominio',
          async () => {
            mockAttachPinImage
              .mockRejectedValueOnce(
                new Error(
                  'Este pin admite hasta 8 medios',
                ),
              )

            const result =
              await attachPinImageAction(
                VALID_IMAGE_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                false,

              error:
                'Este pin admite hasta 8 medios',
            })
          },
        )

        it(
          'con datos inválidos, no llega a verificar Cloudinary ni a attachPinImage',
          async () => {
            const result =
              await attachPinImageAction({
                ...VALID_IMAGE_INPUT,

                pinId:
                  'no-es-un-uuid',
              })

            expect(
              result.ok,
            ).toBe(false)

            expect(
              mockVerifyCloudinaryImageAsset,
            ).not
              .toHaveBeenCalled()

            expect(
              mockAttachPinImage,
            ).not
              .toHaveBeenCalled()
          },
        )

        it(
          'si la verificación de Cloudinary falla, devuelve el mensaje y no registra la imagen',
          async () => {
            mockVerifyCloudinaryImageAsset
              .mockRejectedValueOnce(
                new CloudinaryImageVerificationError(
                  'No se permiten imágenes animadas.',
                ),
              )

            const result =
              await attachPinImageAction(
                VALID_IMAGE_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                false,

              error:
                'No se permiten imágenes animadas.',
            })

            expect(
              mockAttachPinImage,
            ).not
              .toHaveBeenCalled()
          },
        )
      },
    )

    describe(
      'attachPinVideoAction',
      () => {
        it(
          'con datos válidos, adjunta y devuelve ok',
          async () => {
            const result =
              await attachPinVideoAction(
                VALID_VIDEO_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                true,

              mediaId:
                MEDIA_ID,
            })

            expect(
              mockAttachPinVideo,
            ).toHaveBeenCalledTimes(
              1,
            )
          },
        )

        it(
          'traduce el error de duración a un mensaje legible',
          async () => {
            mockAttachPinVideo
              .mockRejectedValueOnce(
                new Error(
                  'Animation is too long',
                ),
              )

            const result =
              await attachPinVideoAction(
                VALID_VIDEO_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                false,

              error:
                'El vídeo no puede superar los 5 segundos.',
            })
          },
        )
      },
    )

    describe(
      'detachPinMediaAction',
      () => {
        const VALID_DETACH_INPUT = {
          pinId:
            PIN_ID,

          mediaId:
            MEDIA_ID,

          cloudinaryPublicId:
            CLOUDINARY_PUBLIC_ID,

          kind:
            'image',
        }

        it(
          'si Postgres y Cloudinary van bien, devuelve ok sin warning',
          async () => {
            const result =
              await detachPinMediaAction(
                VALID_DETACH_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                true,
            })

            expect(
              mockDetachPinMedia,
            ).toHaveBeenCalledTimes(
              1,
            )

            expect(
              mockDeleteCloudinaryAsset,
            ).toHaveBeenCalledWith(
              CLOUDINARY_PUBLIC_ID,
              'image',
            )
          },
        )

        it(
          'si Postgres falla, aborta sin llamar a Cloudinary',
          async () => {
            mockDetachPinMedia
              .mockRejectedValueOnce(
                new Error(
                  'Este medio no pertenece a este pin',
                ),
              )

            const result =
              await detachPinMediaAction(
                VALID_DETACH_INPUT,
              )

            expect(
              result,
            ).toEqual({
              ok:
                false,

              error:
                'Este medio no pertenece a este pin',
            })

            expect(
              mockDeleteCloudinaryAsset,
            ).not
              .toHaveBeenCalled()
          },
        )

        it(
          'si Postgres va bien pero Cloudinary falla, devuelve ok con warning',
          async () => {
            mockDeleteCloudinaryAsset
              .mockRejectedValueOnce(
                new Error(
                  'fallo',
                ),
              )

            const result =
              await detachPinMediaAction(
                VALID_DETACH_INPUT,
              )

            expect(
              result.ok,
            ).toBe(true)

            if (
              result.ok
            ) {
              expect(
                result.warning,
              ).toContain(
                'Cloudinary',
              )
            }
          },
        )
      },
    )
  },
)