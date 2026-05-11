// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de categorias.
export const categoriasRoutes = Router()

function garantirColunaAtivoCategoria(callback) {
  db.all('PRAGMA table_info(categoria)', (error, colunas) => {
    if (error) {
      callback(error)
      return
    }

    const temAtivo = colunas.some((coluna) => coluna.name === 'ativo')

    if (temAtivo) {
      callback()
      return
    }

    db.run('ALTER TABLE categoria ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1', callback)
  })
}

// Cria a rota GET que lista todas as categorias.
categoriasRoutes.get('/categorias', (req, res) => {
  garantirColunaAtivoCategoria((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  const incluirInativos = req.query.incluirInativos === '1'

  // Executa a consulta SQL buscando todas as categorias.
  db.all(
    // Seleciona todos os campos da tabela categoria.
    `SELECT id, descricao, icone, cor, ativo FROM categoria
    ${incluirInativos ? '' : 'WHERE ativo = 1'}
    ORDER BY id`,
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
})

categoriasRoutes.post('/categorias', (req, res) => {
  const { descricao, icone = null, cor = null } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição da categoria.' })
  }

  garantirColunaAtivoCategoria((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    'INSERT INTO categoria (descricao, icone, cor) VALUES (?, ?, ?)',
    [descricao.trim(), icone || null, cor || null],
    function inserirCategoria(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return db.get(
        'SELECT id, descricao, icone, cor, ativo FROM categoria WHERE id = ?',
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
})

categoriasRoutes.put('/categorias/:id', (req, res) => {
  const { descricao, icone = null, cor = null } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição da categoria.' })
  }

  garantirColunaAtivoCategoria((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    'UPDATE categoria SET descricao = ?, icone = ?, cor = ? WHERE id = ?',
    [descricao.trim(), icone || null, cor || null, req.params.id],
    function atualizarCategoria(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Categoria não encontrada.' })
      }

      return db.get(
        'SELECT id, descricao, icone, cor, ativo FROM categoria WHERE id = ?',
        [req.params.id],
        (selectError, row) => {
          if (selectError) {
            return res.status(500).json({ error: selectError.message })
          }

          return res.json(row)
        },
      )
    },
  )
  })
})

categoriasRoutes.patch('/categorias/:id/ativo', (req, res) => {
  const ativo = req.body.ativo ? 1 : 0

  garantirColunaAtivoCategoria((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run('UPDATE categoria SET ativo = ? WHERE id = ?', [ativo, req.params.id], function atualizarStatus(error) {
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada.' })
    }

    return res.json({ id: Number(req.params.id), ativo })
  })
  })
})
