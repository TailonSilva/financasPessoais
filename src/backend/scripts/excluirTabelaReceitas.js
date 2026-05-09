import { db } from '../db.js'

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error)
        return
      }

      resolve(this)
    })
  })
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

async function tabelaExiste(nome) {
  const tabela = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [nome],
  )

  return Boolean(tabela)
}

async function excluirTabelaReceitas() {
  const receitasExiste = await tabelaExiste('receitas')

  if (!receitasExiste) {
    console.log('A tabela "receitas" não existe. Nada foi alterado.')
    return
  }

  await run('DROP TABLE receitas')
  console.log('Tabela "receitas" excluída com sucesso.')
}

try {
  await excluirTabelaReceitas()
} finally {
  await closeDatabase()
}
