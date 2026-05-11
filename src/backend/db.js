// Importa o caminho absoluto para localizar o arquivo do banco.
import path from 'node:path'
// Importa o helper para transformar URLs de módulos em caminhos de arquivo.
import { fileURLToPath } from 'node:url'
// Importa o driver SQLite usado pelo projeto.
import sqlite3 from 'sqlite3'
import { garantirDadosEssenciais } from './seedEssencial.js'

// Guarda o caminho completo do arquivo atual.
const filename = fileURLToPath(import.meta.url)
// Guarda o caminho completo da pasta atual.
const dirname = path.dirname(filename)
// Monta o caminho completo até o arquivo db.sqlite.
const databasePath = process.env.DB_PATH || path.join(dirname, 'db.sqlite')

// Cria e exporta a conexão compartilhada com o banco SQLite.
export const db = new sqlite3.Database(databasePath)

garantirDadosEssenciais(db).catch((error) => {
  console.error('Não foi possível garantir os dados essenciais do banco.', error)
})
