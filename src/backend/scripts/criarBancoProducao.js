import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'
import { garantirDadosEssenciais } from '../seedEssencial.js'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const backendPath = path.resolve(dirname, '..')
const devDatabasePath = path.join(backendPath, 'db.sqlite')
const productionSeedPath = path.join(backendPath, 'db.producao.sqlite')

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error)
        return
      }

      resolve(rows)
    })
  })
}

function exec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

async function criarBancoProducao() {
  await fs.rm(productionSeedPath, { force: true })

  const devDb = new sqlite3.Database(devDatabasePath)
  const prodDb = new sqlite3.Database(productionSeedPath)

  try {
    const objetos = await all(
      devDb,
      `
        SELECT type, name, sql
        FROM sqlite_master
        WHERE sql IS NOT NULL
          AND name NOT LIKE 'sqlite_%'
        ORDER BY
          CASE type
            WHEN 'table' THEN 1
            WHEN 'index' THEN 2
            WHEN 'trigger' THEN 3
            WHEN 'view' THEN 4
            ELSE 5
          END,
          name
      `,
    )

    await exec(prodDb, 'PRAGMA foreign_keys = OFF')

    for (const objeto of objetos) {
      await exec(prodDb, objeto.sql)
    }

    await garantirDadosEssenciais(prodDb)
  } finally {
    devDb.close()
    prodDb.close()
  }
}

criarBancoProducao().catch((error) => {
  console.error(error)
  process.exit(1)
})
