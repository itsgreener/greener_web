import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const container = vi.hoisted(() => ({
  registerCandidate: vi.fn(),
  getCandidateForm: vi.fn(),
  saveCandidateForm: vi.fn(),
  uploadCandidateFile: vi.fn(),
  deleteCandidateFile: vi.fn(),
}))

vi.mock('@/modules/talent/container', () => container)

const TOKEN = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const FILE_ID = '99999999-9999-4999-8999-999999999999'
const BASE = 'http://localhost:3000'
const params = { params: Promise.resolve({ token: TOKEN }) }

function jsonRequest(
  path: string,
  body: unknown,
  {
    method = 'POST',
    headers = {},
  }: { method?: string; headers?: Record<string, string> } = {},
) {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(container)) fn.mockResolvedValue({ ok: true })
})

const { POST: postCandidates } =
  await import('@/app/api/talent/candidates/route')
const { GET: getForm, PUT: putForm } =
  await import('@/app/api/talent/form/[token]/route')
const { POST: postFile, DELETE: deleteFile } =
  await import('@/app/api/talent/form/[token]/files/route')

describe('POST /api/talent/candidates', () => {
  it('pasa el cuerpo, el honeypot y las claves anónimas al caso de uso', async () => {
    const response = await postCandidates(
      jsonRequest(
        '/api/talent/candidates',
        { email: 'a@b.co', website: 'x' },
        {
          headers: { 'x-forwarded-for': '203.0.113.7' },
        },
      ),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })

    const [body, honeypot, context] = container.registerCandidate.mock.calls[0]

    expect(body).toMatchObject({ email: 'a@b.co' })
    expect(honeypot).toBe('x')
    // Hash de la IP, nunca la IP en crudo; y el visitante es un UUID.
    expect(context.ipKey).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(context)).not.toContain('203.0.113.7')
    expect(context.visitorKey).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('pone la cookie técnica de visitante (httpOnly) y no deja cachear', async () => {
    const response = await postCandidates(
      jsonRequest('/api/talent/candidates', { email: 'a@b.co' }),
    )
    const cookie = response.headers.get('set-cookie') ?? ''

    expect(cookie).toContain('greener_visitor=')
    expect(cookie.toLowerCase()).toContain('httponly')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('reutiliza la cookie de visitante que ya trae', async () => {
    await postCandidates(
      jsonRequest(
        '/api/talent/candidates',
        { email: 'a@b.co' },
        {
          headers: { cookie: 'greener_visitor=visitante-conocido' },
        },
      ),
    )

    expect(container.registerCandidate.mock.calls[0][2].visitorKey).toBe(
      'visitante-conocido',
    )
  })

  it('rechaza lo que viene de otro sitio sin llegar al caso de uso', async () => {
    for (const site of ['cross-site', 'same-site']) {
      const response = await postCandidates(
        jsonRequest(
          '/api/talent/candidates',
          { email: 'a@b.co' },
          {
            headers: { 'sec-fetch-site': site },
          },
        ),
      )

      expect(response.status).toBe(403)
    }
    expect(container.registerCandidate).not.toHaveBeenCalled()
  })

  it('acepta same-origin y la ausencia de la cabecera (no es un navegador)', async () => {
    const response = await postCandidates(
      jsonRequest(
        '/api/talent/candidates',
        { email: 'a@b.co' },
        {
          headers: { 'sec-fetch-site': 'same-origin' },
        },
      ),
    )

    expect(response.status).toBe(200)
  })

  it('exige application/json: un formulario HTML cross-site no pasa', async () => {
    const response = await postCandidates(
      new NextRequest(`${BASE}/api/talent/candidates`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'email=a@b.co',
      }),
    )

    expect(response.status).toBe(415)
    expect(container.registerCandidate).not.toHaveBeenCalled()
  })

  it.each(['no es json', '[]', '"texto"', 'null'])(
    'rechaza el cuerpo %s',
    async (body) => {
      const response = await postCandidates(
        jsonRequest('/api/talent/candidates', body),
      )

      expect(response.status).toBe(400)
      expect(container.registerCandidate).not.toHaveBeenCalled()
    },
  )

  it('rechaza un cuerpo enorme', async () => {
    const response = await postCandidates(
      jsonRequest('/api/talent/candidates', {
        email: 'a@b.co',
        basura: 'x'.repeat(70_000),
      }),
    )

    expect(response.status).toBe(413)
  })

  it.each([
    [
      {
        ok: false,
        reason: 'invalid',
        fieldErrors: { email: ['Enter a valid email'] },
      },
      400,
    ],
    [{ ok: false, reason: 'rate_limited' }, 429],
    [{ ok: false, reason: 'unavailable' }, 503],
  ])('traduce el fallo %j a HTTP %i', async (failure, status) => {
    container.registerCandidate.mockResolvedValueOnce(failure)

    const response = await postCandidates(
      jsonRequest('/api/talent/candidates', { email: 'a@b.co' }),
    )

    expect(response.status).toBe(status)
    expect(await response.json()).toMatchObject({
      error: (failure as { reason: string }).reason,
    })
  })
})

describe('GET y PUT /api/talent/form/[token]', () => {
  it('GET devuelve el formulario', async () => {
    container.getCandidateForm.mockResolvedValueOnce({
      ok: true,
      form: { name: 'Ada' },
    })

    const response = await getForm(
      new NextRequest(`${BASE}/api/talent/form/${TOKEN}`),
      params,
    )

    expect(await response.json()).toEqual({ form: { name: 'Ada' } })
    expect(container.getCandidateForm.mock.calls[0][0]).toBe(TOKEN)
  })

  it('GET con un token que no existe es 404 con el mismo cuerpo siempre', async () => {
    container.getCandidateForm.mockResolvedValueOnce({
      ok: false,
      reason: 'not_found',
    })

    const response = await getForm(
      new NextRequest(`${BASE}/api/talent/form/${TOKEN}`),
      params,
    )

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })

  it('GET desde otro sitio: 403', async () => {
    const response = await getForm(
      new NextRequest(`${BASE}/api/talent/form/${TOKEN}`, {
        headers: { 'sec-fetch-site': 'cross-site' },
      }),
      params,
    )

    expect(response.status).toBe(403)
    expect(container.getCandidateForm).not.toHaveBeenCalled()
  })

  it('PUT pasa token, cuerpo y honeypot', async () => {
    const response = await putForm(
      jsonRequest(
        `/api/talent/form/${TOKEN}`,
        { name: 'Ada', website: '' },
        { method: 'PUT' },
      ),
      params,
    )

    expect(response.status).toBe(200)
    expect(container.saveCandidateForm.mock.calls[0].slice(0, 3)).toEqual([
      TOKEN,
      { name: 'Ada', website: '' },
      '',
    ])
  })

  it('PUT con un email que es de otro candidato responde 409 email_taken', async () => {
    container.saveCandidateForm.mockResolvedValueOnce({
      ok: false,
      reason: 'email_taken',
    })

    const response = await putForm(
      jsonRequest(`/api/talent/form/${TOKEN}`, {}, { method: 'PUT' }),
      params,
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'email_taken' })
  })

  it('PUT con errores de validación devuelve los errores por campo', async () => {
    container.saveCandidateForm.mockResolvedValueOnce({
      ok: false,
      reason: 'invalid',
      fieldErrors: { projects: ['Add at least one project'] },
    })

    const response = await putForm(
      jsonRequest(`/api/talent/form/${TOKEN}`, {}, { method: 'PUT' }),
      params,
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: 'invalid',
      fieldErrors: { projects: ['Add at least one project'] },
    })
  })

  it('PUT exige JSON', async () => {
    const response = await putForm(
      new NextRequest(`${BASE}/api/talent/form/${TOKEN}`, {
        method: 'PUT',
        headers: { 'content-type': 'text/plain' },
        body: '{}',
      }),
      params,
    )

    expect(response.status).toBe(415)
  })
})

describe('POST y DELETE /api/talent/form/[token]/files', () => {
  function upload(
    file: File | string | null,
    headers: Record<string, string> = {},
  ) {
    const form = new FormData()
    if (file !== null) form.append('file', file)

    return new NextRequest(`${BASE}/api/talent/form/${TOKEN}/files`, {
      method: 'POST',
      body: form,
      headers,
    })
  }

  it('POST sube un fichero (campo "file") y responde 201 con id y extensión', async () => {
    container.uploadCandidateFile.mockResolvedValueOnce({
      ok: true,
      file: { id: FILE_ID, extension: 'pdf' },
    })

    const response = await postFile(
      upload(
        new File([new Uint8Array([1, 2, 3])], 'cv.pdf', {
          type: 'application/pdf',
        }),
      ),
      params,
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      file: { id: FILE_ID, extension: 'pdf' },
    })

    const [token, file] = container.uploadCandidateFile.mock.calls[0]

    expect(token).toBe(TOKEN)
    expect(file.name).toBe('cv.pdf')
    expect([...file.bytes]).toEqual([1, 2, 3])
  })

  it('POST sin el campo "file" o con texto en su lugar: 400', async () => {
    expect((await postFile(upload(null), params)).status).toBe(400)
    expect((await postFile(upload('no soy un fichero'), params)).status).toBe(
      400,
    )
    expect(container.uploadCandidateFile).not.toHaveBeenCalled()
  })

  it('POST con Content-Length muy por encima del tope: 413 sin leer el cuerpo', async () => {
    const response = await postFile(
      upload(new File([new Uint8Array(1)], 'a.pdf'), {
        'content-length': String(50 * 1000 * 1000),
      }),
      params,
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({ error: 'file_too_large' })
    expect(container.uploadCandidateFile).not.toHaveBeenCalled()
  })

  it.each([
    ['file_empty', 400],
    ['file_too_large', 413],
    ['file_type', 415],
    ['too_many_files', 409],
    ['file_scan', 422],
  ])('rechazo %s → HTTP %i', async (rejection, status) => {
    container.uploadCandidateFile.mockResolvedValueOnce({
      ok: false,
      reason: 'file_rejected',
      rejection,
    })

    const response = await postFile(
      upload(new File([new Uint8Array(1)], 'a.pdf')),
      params,
    )

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: rejection })
  })

  it('POST desde otro sitio: 403', async () => {
    const response = await postFile(
      upload(new File([new Uint8Array(1)], 'a.pdf'), {
        'sec-fetch-site': 'cross-site',
      }),
      params,
    )

    expect(response.status).toBe(403)
  })

  it('DELETE con fileId válido', async () => {
    const response = await deleteFile(
      new NextRequest(
        `${BASE}/api/talent/form/${TOKEN}/files?fileId=${FILE_ID}`,
        {
          method: 'DELETE',
        },
      ),
      params,
    )

    expect(response.status).toBe(200)
    expect(container.deleteCandidateFile.mock.calls[0].slice(0, 2)).toEqual([
      TOKEN,
      FILE_ID,
    ])
  })

  it.each(['', '?fileId=', '?fileId=abc', '?fileId=../../x'])(
    'DELETE con fileId inválido (%j): 404 sin llegar al caso de uso',
    async (query) => {
      const response = await deleteFile(
        new NextRequest(`${BASE}/api/talent/form/${TOKEN}/files${query}`, {
          method: 'DELETE',
        }),
        params,
      )

      expect(response.status).toBe(404)
      expect(container.deleteCandidateFile).not.toHaveBeenCalled()
    },
  )
})
