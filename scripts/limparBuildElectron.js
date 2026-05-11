import fs from 'node:fs/promises'
import path from 'node:path'

const pathsLimpeza = [path.resolve('release-temp'), path.resolve('release')]
const maxTentativas = 12
const intervaloMs = 1000

function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function limparPasta(caminho) {
  for (let tentativa = 1; tentativa <= maxTentativas; tentativa += 1) {
    try {
      await fs.rm(caminho, {
        force: true,
        maxRetries: 3,
        recursive: true,
        retryDelay: 500,
      })
      return
    } catch (error) {
      const deveTentarNovamente =
        ['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error.code) && tentativa < maxTentativas

      if (!deveTentarNovamente) {
        console.error(
          `Nao foi possivel limpar ${caminho}. Feche o aplicativo empacotado, ` +
            `janelas do Explorer abertas na build e tente novamente.\nArquivo: ${error.path || caminho}`,
        )
        throw error
      }

      console.warn(
        `Pasta ocupada (${error.code}). Tentando novamente em ${intervaloMs / 1000}s ` +
          `(${tentativa}/${maxTentativas})...`,
      )
      await esperar(intervaloMs)
    }
  }
}

for (const caminho of pathsLimpeza) {
  await limparPasta(caminho)
}
