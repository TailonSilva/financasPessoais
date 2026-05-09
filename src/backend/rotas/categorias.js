// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de categorias.
export const categoriasRoutes = Router()

// Cria a rota GET que lista todas as categorias.
categoriasRoutes.get('/categorias', (_req, res) => {
  // Executa a consulta SQL buscando todas as categorias.
  db.all(
    // Seleciona todos os campos da tabela categoria.
    'SELECT id, descricao, icone, cor FROM categoria ORDER BY id',
    // Recebe erro ou resultado da consulta.
    (error, rows) => {
      // Se houver erro, retorna status 500 com a mensagem.
      if (error) {
        // Envia o erro em formato JSON.
        return res.status(500).json({ error: error.message })
      }

      // Se não houver erro, retorna a lista de categorias.
      return res.json(rows)
    },
  )
})

categoriasRoutes.post('/categorias', (req, res) => {
  const { descricao, icone = null, cor = null } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição da categoria.' })
  }

  db.run(
    'INSERT INTO categoria (descricao, icone, cor) VALUES (?, ?, ?)',
    [descricao.trim(), icone || null, cor || null],
    function inserirCategoria(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return db.get(
        'SELECT id, descricao, icone, cor FROM categoria WHERE id = ?',
        [this.lastID],
        (selectError, row) => {
          if (selectError) {
            return res.status(500).json({ error: selectError.message })
          }

          return res.status(201).json(row)
        },
      )
    },
  )
})
