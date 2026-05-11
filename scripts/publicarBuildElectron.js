import fs from 'node:fs/promises'
import path from 'node:path'

const releasePath = path.resolve('release')
const tempPath = path.resolve('release-temp')
const ignorados = new Set(['win-unpacked'])

async function existe(caminho) {
  try {
    await fs.access(caminho)
    return true
  } catch {
    return false
  }
}

async function copiarArtefatosFinais() {
  await fs.mkdir(releasePath, { recursive: true })

  const itens = await fs.readdir(tempPath, { withFileTypes: true })

  await Promise.all(
    itens
      .filter((item) => !ignorados.has(item.name))
      .map((item) =>
        fs.cp(path.join(tempPath, item.name), path.join(releasePath, item.name), {
          force: true,
          recursive: true,
        }),
      ),
  )
}

if (!(await existe(tempPath))) {
  throw new Error('A pasta temporaria da build do Electron nao foi encontrada.')
}

await copiarArtefatosFinais()
await fs.rm(tempPath, {
  force: true,
  maxRetries: 5,
  recursive: true,
  retryDelay: 1000,
})
