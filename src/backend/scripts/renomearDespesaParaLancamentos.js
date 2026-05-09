import sqlite3 from 'sqlite3'
import { db } from '../db.js'

const novaTabela = 'lançamentos'

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

async function renomearDespesaParaLancamentos() {
  sqlite3.verbose()

  const despesaExiste = await tabelaExiste('despesa')
  const lancamentosExiste = await tabelaExiste(novaTabela)

  if (!despesaExiste && lancamentosExiste) {
    console.log(`A tabela "${novaTabela}" já existe. Nada foi alterado.`)
    return
  }

  if (!despesaExiste) {
    throw new Error('A tabela "despesa" não existe no banco.')
  }

  if (lancamentosExiste) {
    throw new Error(
      `As tabelas "despesa" e "${novaTabela}" existem. Renomeie ou una os dados manualmente antes de continuar.`,
    )
  }

  await run('ALTER TABLE despesa RENAME TO "lançamentos"')
  console.log('Tabela "despesa" renomeada para "lançamentos".')
}

try {
  await renomearDespesaParaLancamentos()
} finally {
  await closeDatabase()
}
