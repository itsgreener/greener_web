// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const getSignedImageUpload = vi.fn()
const uploadImageToCloudinary = vi.fn()
const discardUploadQuietly = vi.fn()

vi.mock('@/modules/media/client/cloudinaryUpload', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/media/client/cloudinaryUpload')
  >('@/modules/media/client/cloudinaryUpload')

  return {
    ...actual,
    getSignedImageUpload: () => getSignedImageUpload(),
    uploadImageToCloudinary: (...args: unknown[]) =>
      uploadImageToCloudinary(...args),
  }
})

vi.mock('@/app/admin/(panel)/contents/[id]/edit/discardUpload', () => ({
  discardUploadQuietly: (...args: unknown[]) => discardUploadQuietly(...args),
}))

import {
  uploadImageFlow,
  useCloudinaryUpload,
} from '@/app/admin/(panel)/contents/[id]/edit/useCloudinaryUpload'

const FILE = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

const UPLOADED = {
  public_id: 'greener/abc',
  format: 'jpg',
  width: 100,
  height: 100,
  bytes: 10,
}

beforeEach(() => {
  vi.clearAllMocks()
  getSignedImageUpload.mockResolvedValue({ signed: true })
  uploadImageToCloudinary.mockResolvedValue(UPLOADED)
})

describe('uploadImageFlow', () => {
  it('firma, sube y registra; devuelve el resultado y no descarta nada', async () => {
    const register = vi.fn().mockResolvedValue({ ok: true })

    const result = await uploadImageFlow(FILE, { register })

    expect(result).toEqual(UPLOADED)
    expect(register).toHaveBeenCalledWith(UPLOADED)
    expect(discardUploadQuietly).not.toHaveBeenCalled()
  })

  it('si registrar falla, descarta el archivo subido y lanza el error del servidor', async () => {
    const register = vi
      .fn()
      .mockResolvedValue({ ok: false, error: 'Rechazado' })

    await expect(uploadImageFlow(FILE, { register })).rejects.toThrow(
      'Rechazado',
    )

    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/abc',
      kind: 'image',
    })
  })

  it('si beforeUpload lanza, no firma ni sube nada', async () => {
    const register = vi.fn()

    await expect(
      uploadImageFlow(FILE, {
        beforeUpload: () => {
          throw new Error('Demasiado grande')
        },
        register,
      }),
    ).rejects.toThrow('Demasiado grande')

    expect(getSignedImageUpload).not.toHaveBeenCalled()
    expect(register).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith(null)
  })

  it('si afterUpload devuelve false, descarta el archivo y no registra ni lanza', async () => {
    const register = vi.fn()

    const result = await uploadImageFlow(FILE, {
      afterUpload: () => false,
      register,
    })

    expect(result).toBeNull()
    expect(register).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledWith({
      publicId: 'greener/abc',
      kind: 'image',
    })
  })

  it('si afterUpload lanza, descarta el archivo y propaga el error', async () => {
    const register = vi.fn()

    await expect(
      uploadImageFlow(FILE, {
        afterUpload: () => {
          throw new Error('Dura demasiado')
        },
        register,
      }),
    ).rejects.toThrow('Dura demasiado')

    expect(register).not.toHaveBeenCalled()
    expect(discardUploadQuietly).toHaveBeenCalledOnce()
  })
})

describe('useCloudinaryUpload', () => {
  it('marca «subiendo» durante el flujo y deja el resultado al terminar', async () => {
    const { result } = renderHook(() => useCloudinaryUpload())

    let uploaded: unknown

    await act(async () => {
      uploaded = await result.current.uploadImage(FILE, {
        register: async () => ({ ok: true }),
      })
    })

    expect(uploaded).toEqual(UPLOADED)
    expect(result.current.uploading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('un fallo se queda en `error` y devuelve null', async () => {
    const { result } = renderHook(() => useCloudinaryUpload())

    let uploaded: unknown = 'sin tocar'

    await act(async () => {
      uploaded = await result.current.uploadImage(FILE, {
        register: async () => ({ ok: false, error: 'Rechazado' }),
      })
    })

    expect(uploaded).toBeNull()
    expect(result.current.error).toBe('Rechazado')
    expect(result.current.uploading).toBe(false)
  })

  it('un error que no es Error usa el mensaje genérico de la imagen', async () => {
    getSignedImageUpload.mockRejectedValue('boom')

    const { result } = renderHook(() => useCloudinaryUpload())

    await act(async () => {
      await result.current.uploadImage(FILE, {
        register: async () => ({ ok: true }),
      })
    })

    expect(result.current.error).toBe('No se ha podido subir la imagen.')
  })

  it('una subida nueva limpia el error y el aviso anteriores', async () => {
    const { result } = renderHook(() => useCloudinaryUpload())

    act(() => {
      result.current.setError('viejo')
      result.current.setWarning('viejo aviso')
    })

    await act(async () => {
      await result.current.uploadImage(FILE, {
        register: async () => ({ ok: true }),
      })
    })

    expect(result.current.error).toBeNull()
    expect(result.current.warning).toBeNull()
  })
})
