// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de tipos de conta.
export const tiposContaRoutes = Router()

function garantirColunaAtivoTipoConta(callback) {
  db.all('PRAGMA table_info(tipo_conta)', (error, colunas) => {
    if (error) {
      callback(error)
      return
    }

    const temAtivo = colunas.some((coluna) => coluna.name === 'ativo')

    if (temAtivo) {
      callback()
      return
    }

    db.run('ALTER TABLE tipo_conta ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1', callback)
  })
}

// Cria a rota GET que lista todos os tipos de conta.
tiposContaRoutes.get('/tipos-conta', (req, res) => {
  garantirColunaAtivoTipoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  const incluirInativos = req.query.incluirInativos === '1'

  // Executa a consulta SQL buscando todos os tipos de conta.
  db.all(
    // Seleciona todos os campos da tabela tipo_conta.
    `SELECT id, descricao, ativo FROM tipo_conta
    ${incluirInativos ? '' : 'WHERE ativo = 1'}
    ORDER BY id`,
    // Recebe erro ou resultado da consulta.
    (error, rows) => {
      // Se houver erro, retorna status 500 com a mensagem.
      if (error) {
        // Envia o erro em formato JSON.
        return res.status(500).json({ error: error.message })
      }

      // Se não houver erro, retorna a lista de tipos de conta.
      return res.json(rows)
    },
  )
  })
})

tiposContaRoutes.post('/tipos-conta', (req, res) => {
  const { descricao } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição do tipo de conta.' })
  }

  garantirColunaAtivoTipoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    'INSERT INTO tipo_conta (descricao) VALUES (?)',
    [descricao.trim()],
    function inserirTipoConta(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return db.get(
        'SELECT id, descricao, ativo FROM tipo_conta WHERE id = ?',
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

tiposContaRoutes.put('/tipos-conta/:id', (req, res) => {
  const { descricao } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição do tipo de conta.' })
  }

  garantirColunaAtivoTipoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    'UPDATE tipo_conta SET descricao = ? WHERE id = ?',
    [descricao.trim(), req.params.id],
    function atualizarTipoConta(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Tipo de conta não encontrado.' })
      }

      return db.get(
        'SELECT id, descricao, ativo FROM tipo_conta WHERE id = ?',
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

tiposContaRoutes.patch('/tipos-conta/:id/ativo', (req, res) => {
  const ativo = req.body.ativo ? 1 : 0

  garantirColunaAtivoTipoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run('UPDATE tipo_conta SET ativo = ? WHERE id = ?', [ativo, req.params.id], function atualizarStatus(error) {
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Tipo de conta não encontrado.' })
    }

    return res.json({ id: Number(req.params.id), ativo })
  })
  })
})
