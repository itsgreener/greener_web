import fc from 'fast-check'
import { describe, expect, it } from 'vitest'

import {
  CANDIDATE_STATUS_FILTER_VALUES,
  PROFILE_VALUES,
  TALENT_ADMIN_PAGE_SIZE,
} from '@/modules/talent/domain/talentConstants'
import {
  classifyCvLocation,
  externalCvUrl,
  isBucketPath,
} from '@/modules/talent/domain/talentCvLocation'
import { buildStaffUploadRow } from '@/modules/talent/domain/talentRows'
import {
  candidatePageCount,
  parseCandidateSearchQuery,
} from '@/modules/talent/domain/talentSearchQuery'

describe('parseCandidateSearchQuery', () => {
  it('sin parámetros: página 1, sin filtros', () => {
    expect(parseCandidateSearchQuery({})).toEqual({
      q: '',
      status: '',
      profile: '',
      page: 1,
      pageSize: TALENT_ADMIN_PAGE_SIZE,
    })
  })

  it('acepta cada estado y cada perfil conocidos', () => {
    for (const status of CANDIDATE_STATUS_FILTER_VALUES) {
      expect(parseCandidateSearchQuery({ status }).status).toBe(status)
    }

    for (const profile of PROFILE_VALUES) {
      expect(parseCandidateSearchQuery({ profile }).profile).toBe(profile)
    }
  })

  it('ignora un estado o un perfil inventados en vez de romper', () => {
    const query = parseCandidateSearchQuery({
      status: 'borrado',
      profile: 'x; drop table',
    })

    expect(query.status).toBe('')
    expect(query.profile).toBe('')
  })

  it('quita los caracteres con significado en ilike y en or() de PostgREST', () => {
    expect(parseCandidateSearchQuery({ q: '  a%b_c*d,e(f)g"h\\i  ' }).q).toBe(
      'a b c d e f g h i',
    )
  })

  it('recorta el texto a 100 caracteres', () => {
    expect(parseCandidateSearchQuery({ q: 'a'.repeat(300) }).q).toHaveLength(
      100,
    )
  })

  it('la página no válida o menor que 1 vale 1', () => {
    for (const page of ['0', '-3', 'abc', '2.5x', '']) {
      expect(parseCandidateSearchQuery({ page }).page).toBe(
        page === '2.5x' ? 2 : 1,
      )
    }

    expect(parseCandidateSearchQuery({ page: '7' }).page).toBe(7)
  })

  it('propiedad: el texto saneado nunca contiene un carácter peligroso', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (q) => {
        expect(parseCandidateSearchQuery({ q }).q).not.toMatch(/[%_*,()"\\]/)
      }),
    )
  })
})

describe('candidatePageCount', () => {
  it('redondea hacia arriba y nunca baja de 1', () => {
    expect(candidatePageCount(0, 25)).toBe(1)
    expect(candidatePageCount(25, 25)).toBe(1)
    expect(candidatePageCount(26, 25)).toBe(2)
    expect(candidatePageCount(1018, 25)).toBe(41)
  })
})

describe('classifyCvLocation', () => {
  it('reconoce los cuatro tipos de destino del contrato de datos', () => {
    expect(classifyCvLocation('uploads/3f2a.pdf')).toBe('bucket')
    expect(
      classifyCvLocation(
        'https://drive.google.com/file/d/abc/view?usp=drivesdk',
      ),
    ).toBe('drive')
    expect(classifyCvLocation('https://docs.google.com/document/d/abc')).toBe(
      'drive',
    )
    expect(classifyCvLocation('https://example.com/cv.pdf')).toBe('external')
    expect(classifyCvLocation('algo que no es una url')).toBe('external')
    expect(classifyCvLocation(null)).toBe('none')
    expect(classifyCvLocation('   ')).toBe('none')
  })

  it('las rutas viejas con espacios y acentos siguen siendo del bucket', () => {
    expect(classifyCvLocation('uploads/Mi CV (2).pdf')).toBe('bucket')
    expect(classifyCvLocation('uploads/Currículum.docx')).toBe('bucket')
  })

  it('no firma nada fuera de uploads/ ni con escapes de directorio', () => {
    for (const path of [
      'uploads/../secreto.pdf',
      'uploads/a/../b.pdf',
      'uploads/',
      'uploads//x.pdf',
      'uploads\\x.pdf',
      'otra/carpeta.pdf',
      '/uploads/x.pdf',
    ]) {
      expect(isBucketPath(path)).toBe(false)
    }
  })

  it('un host que solo se parece a Drive no cuenta como Drive', () => {
    expect(classifyCvLocation('https://drive.google.com.evil.example/x')).toBe(
      'external',
    )
    expect(classifyCvLocation('http://drive.google.com/file/d/abc')).toBe(
      'external',
    )
  })

  it('propiedad: nada con ".." entre barras es del bucket', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (before, after) => {
        expect(isBucketPath(`uploads/${before}/../${after}`)).toBe(false)
      }),
    )
  })
})

describe('externalCvUrl', () => {
  it('solo devuelve URLs https (SEC-ADM-B3)', () => {
    expect(externalCvUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(externalCvUrl('http://example.com/a')).toBeNull()
    expect(externalCvUrl('HTTP://example.com/a')).toBeNull()
    expect(externalCvUrl('javascript:alert(1)')).toBeNull()
    expect(externalCvUrl('data:text/html,<script>1</script>')).toBeNull()
    expect(externalCvUrl('ftp://example.com/a')).toBeNull()
    expect(externalCvUrl('no es una url')).toBeNull()
    expect(externalCvUrl(null)).toBeNull()
  })
})

describe('buildStaffUploadRow', () => {
  it('escribe solo status, file_path y uploaded_by (lo demás lo pone n8n)', () => {
    expect(buildStaffUploadRow('uploads/x.pdf', 'ana@itsgreener.com')).toEqual({
      status: 'pending',
      file_path: 'uploads/x.pdf',
      uploaded_by: 'ana@itsgreener.com',
    })
  })
})
