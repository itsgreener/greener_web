#!/usr/bin/env node
// Arranca la compilación de producción (`.next/standalone`) para los E2E. El
// servidor standalone no copia `public/` ni `.next/static/` (docs/operaciones/
// despliegue.md), así que se copian aquí antes de arrancarlo. Las variables de
// entorno las pone quien lo llama (scripts/e2e-env.mjs).

import { spawn } from 'node:child_process'
import { cpSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')
const server = join(standalone, 'server.js')

if (!existsSync(server)) {
  console.error(
    'No existe .next/standalone/server.js: ejecuta `npm run build` con las variables de scripts/e2e-env.mjs antes.',
  )
  process.exit(1)
}

cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true })
cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), {
  recursive: true,
})

const child = spawn(process.execPath, [server], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: process.env.PORT ?? '3000',
    HOSTNAME: process.env.HOSTNAME_E2E ?? '127.0.0.1',
  },
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}

child.on('exit', (code) => process.exit(code ?? 0))
