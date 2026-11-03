import {
  createServer,
  type AddressInfo,
  type Server,
  type Socket,
} from 'node:net'

/**
 * Receptor SMTP mínimo para los E2E del formulario de contacto: acepta lo que
 * le manda nodemailer (con o sin login) y guarda los mensajes para que el test
 * los lea. Sin Docker ni dependencias: es un servidor de sockets de Node.
 *
 * No implementa SMTP completo: solo lo que necesita un envío de una sola
 * persona (EHLO, AUTH PLAIN o LOGIN, MAIL, RCPT, DATA, RSET, NOOP, QUIT).
 */

export interface ReceivedMail {
  /** Remitente del sobre (`MAIL FROM`). */
  envelopeFrom: string
  /** Destinatarios del sobre (`RCPT TO`). */
  envelopeTo: string[]
  /** Cabeceras, ya desplegadas (una línea por cabecera) y con el asunto descodificado. */
  headers: Record<string, string>
  /** Cuerpo completo del mensaje, con las partes MIME descodificadas. */
  body: string
}

export interface SmtpSink {
  /** Puerto en el que escucha (con `startSmtpSink(0)`, el que asignó el sistema). */
  port: number
  mails: ReceivedMail[]
  close(): Promise<void>
}

/** Descodifica `=XX` y los saltos suaves (`=` al final de línea) de quoted-printable. */
function decodeQuotedPrintable(text: string): string {
  const unfolded = text.replace(/=\r?\n/g, '')
  const bytes: number[] = []

  for (let i = 0; i < unfolded.length; i++) {
    const hex = unfolded.slice(i + 1, i + 3)
    if (unfolded[i] === '=' && /^[0-9A-F]{2}$/i.test(hex)) {
      bytes.push(parseInt(hex, 16))
      i += 2
    } else {
      bytes.push(...Buffer.from(unfolded[i], 'utf8'))
    }
  }

  return Buffer.from(bytes).toString('utf8')
}

/** Descodifica las palabras codificadas de una cabecera (`=?UTF-8?B?…?=` y `?Q?`). */
function decodeHeader(value: string): string {
  // RFC 2047: el espacio entre dos palabras codificadas seguidas no cuenta (es
  // el pliegue de línea de una cabecera larga).
  return value
    .replace(/(\?=)\s+(?==\?)/g, '$1')
    .replace(
      /=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi,
      (_match, _charset: string, encoding: string, text: string) =>
        encoding.toUpperCase() === 'B'
          ? Buffer.from(text, 'base64').toString('utf8')
          : decodeQuotedPrintable(text.replace(/_/g, ' ')),
    )
}

function parseMessage(raw: string): Pick<ReceivedMail, 'headers' | 'body'> {
  const split = raw.indexOf('\r\n\r\n')
  const head = split === -1 ? raw : raw.slice(0, split)
  const rest = split === -1 ? '' : raw.slice(split + 4)

  const headers: Record<string, string> = {}
  for (const line of head.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) {
    const colon = line.indexOf(':')
    if (colon > 0) {
      headers[line.slice(0, colon).toLowerCase()] = decodeHeader(
        line.slice(colon + 1).trim(),
      )
    }
  }

  // Cada parte MIME puede ir en quoted-printable o base64: se descodifican
  // todas para que el test busque texto normal. Un mensaje sin partes
  // (`text` sin `html`) lleva la codificación en sus propias cabeceras.
  const decodePart = (partHead: string, partBody: string): string => {
    if (/content-transfer-encoding:\s*base64/i.test(partHead)) {
      return Buffer.from(partBody.replace(/\s+/g, ''), 'base64').toString(
        'utf8',
      )
    }
    if (/content-transfer-encoding:\s*quoted-printable/i.test(partHead)) {
      return decodeQuotedPrintable(partBody)
    }
    return partBody
  }

  const decoded = /^multipart\//i.test(headers['content-type'] ?? '')
    ? rest
        .split(/\r\n--[^\r\n]+/)
        .map((part) => {
          const partSplit = part.indexOf('\r\n\r\n')
          return partSplit === -1
            ? part
            : decodePart(part.slice(0, partSplit), part.slice(partSplit + 4))
        })
        .join('\n')
    : decodePart(head, rest)

  return { headers, body: decoded }
}

function address(argument: string): string {
  return /<([^>]*)>/.exec(argument)?.[1] ?? argument.trim()
}

function serve(socket: Socket, mails: ReceivedMail[]) {
  let pending = ''
  let envelopeFrom = ''
  let envelopeTo: string[] = []
  let data: string | null = null
  // Pasos del login pendientes: qué espera el servidor en la próxima línea.
  let auth: 'plain' | 'login-user' | 'login-pass' | null = null

  const reply = (line: string) => socket.write(`${line}\r\n`)

  const onLine = (line: string) => {
    if (auth) {
      if (auth === 'login-user') {
        auth = 'login-pass'
        reply('334 UGFzc3dvcmQ6')
      } else {
        auth = null
        reply('235 2.7.0 Authentication successful')
      }
      return
    }

    const [verb, ...restParts] = line.split(' ')
    const rest = restParts.join(' ')

    switch (verb.toUpperCase()) {
      case 'EHLO':
      case 'HELO':
        socket.write(
          '250-e2e-smtp-sink\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n',
        )
        break
      case 'AUTH':
        if (/^PLAIN$/i.test(rest.trim())) {
          auth = 'plain'
          reply('334 ')
        } else if (/^LOGIN$/i.test(rest.trim())) {
          auth = 'login-user'
          reply('334 VXNlcm5hbWU6')
        } else {
          // `AUTH PLAIN <credenciales>` en una sola línea.
          reply('235 2.7.0 Authentication successful')
        }
        break
      case 'MAIL':
        envelopeFrom = address(rest)
        envelopeTo = []
        reply('250 OK')
        break
      case 'RCPT':
        envelopeTo.push(address(rest))
        reply('250 OK')
        break
      case 'DATA':
        data = ''
        reply('354 End data with <CR><LF>.<CR><LF>')
        break
      case 'RSET':
      case 'NOOP':
        reply('250 OK')
        break
      case 'QUIT':
        reply('221 Bye')
        socket.end()
        break
      default:
        reply('502 Command not implemented')
    }
  }

  socket.setEncoding('utf8')
  socket.on('error', () => socket.destroy())
  socket.on('data', (chunk: string) => {
    pending += chunk

    for (;;) {
      if (data !== null) {
        const end = pending.indexOf('\r\n.\r\n')
        if (end === -1) {
          // Un mensaje vacío acaba justo en «.\r\n».
          if (!pending.startsWith('.\r\n')) return
          pending = pending.slice(3)
        } else {
          data = pending.slice(0, end)
          pending = pending.slice(end + 5)
        }

        // Deshacer el «dot stuffing» de SMTP.
        const raw = (data ?? '').replace(/^\./gm, '')
        mails.push({ envelopeFrom, envelopeTo, ...parseMessage(raw) })
        data = null
        reply('250 OK queued')
        continue
      }

      const newline = pending.indexOf('\r\n')
      if (newline === -1) return
      const line = pending.slice(0, newline)
      pending = pending.slice(newline + 2)
      onLine(line)
    }
  })

  reply('220 e2e-smtp-sink ESMTP')
}

export function startSmtpSink(port: number): Promise<SmtpSink> {
  const mails: ReceivedMail[] = []
  const sockets = new Set<Socket>()
  const server: Server = createServer((socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    serve(socket, mails)
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () =>
      resolve({
        port: (server.address() as AddressInfo).port,
        mails,
        close: () =>
          new Promise<void>((done) => {
            for (const socket of sockets) socket.destroy()
            server.close(() => done())
          }),
      }),
    )
  })
}
