// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de contas.
export const routes = Router()

function garantirColunaAtivoConta(callback) {
  db.all('PRAGMA table_info(conta)', (error, colunas) => {
    if (error) {
      callback(error)
      return
    }

    const temAtivo = colunas.some((coluna) => coluna.name === 'ativo')

    if (temAtivo) {
      callback()
      return
    }

    db.run('ALTER TABLE conta ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1', callback)
  })
}

// Cria a rota GET que lista todas as contas.
routes.get('/contas', (req, res) => {
  garantirColunaAtivoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  const incluirInativos = req.query.incluirInativos === '1'

  // Executa a consulta SQL buscando as contas e seus relacionamentos.
  db.all(
    // Seleciona os campos principais da conta, do tipo de conta e do banco.
    `SELECT
      conta.id,
      conta.descricao,
      conta.saldoInicial,
      conta.saldoAtual,
      conta.ativo,
      conta.tipo_conta_id,
      tipo_conta.descricao AS tipo_conta,
      conta.banco_id,
      banco.nome AS banco,
      banco.imagem AS banco_imagem
    FROM conta
    LEFT JOIN tipo_conta ON tipo_conta.id = conta.tipo_conta_id
    LEFT JOIN banco ON banco.id = conta.banco_id
    WHERE ${incluirInativos ? '1 = 1' : 'conta.ativo = 1'}
      AND (${incluirInativos ? '1 = 1' : 'tipo_conta.id IS NULL OR tipo_conta.ativo = 1'})
      AND (${incluirInativos ? '1 = 1' : 'banco.id IS NULL OR banco.ativo = 1'})
    ORDER BY conta.id`,
    // Recebe erro ou resultado da consulta.
    (error, rows) => {
      // Se houver erro, retorna status 500 com a mensagem.
      if (error) {
        // Envia o erro em formato JSON.
        return res.status(500).json({ error: error.message })
      }

      // Se não houver erro, retorna a lista de contas.
      return res.json(rows)
    },
  )
  })
})

routes.post('/contas', (req, res) => {
  const {
    descricao,
    icone = null,
    saldoInicial = 0,
    tipo_conta_id = null,
    banco_id = null,
  } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição da conta.' })
  }

  const saldo = Number(saldoInicial || 0)

  if (Number.isNaN(saldo)) {
    return res.status(400).json({ error: 'Informe um saldo inicial válido.' })
  }

  garantirColunaAtivoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    `INSERT INTO conta (
      descricao,
      icone,
      saldoInicial,
      saldoAtual,
      tipo_conta_id,
      banco_id
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      descricao.trim(),
      icone || null,
      saldo,
      saldo,
      tipo_conta_id || null,
      banco_id || null,
    ],
    function inserirConta(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return db.get(
        `SELECT
          conta.id,
          conta.descricao,
          conta.saldoInicial,
          conta.saldoAtual,
          conta.ativo,
          conta.tipo_conta_id,
          tipo_conta.descricao AS tipo_conta,
          conta.banco_id,
          banco.nome AS banco,
          banco.imagem AS banco_imagem
        FROM conta
        LEFT JOIN tipo_conta ON tipo_conta.id = conta.tipo_conta_id
        LEFT JOIN banco ON banco.id = conta.banco_id
        WHERE conta.id = ?`,
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

routes.put('/contas/:id', (req, res) => {
  const {
    descricao,
    icone = null,
    saldoInicial = 0,
    tipo_conta_id = null,
    banco_id = null,
  } = req.body

  if (!descricao?.trim()) {
    return res.status(400).json({ error: 'Informe a descrição da conta.' })
  }

  const saldo = Number(saldoInicial || 0)

  if (Number.isNaN(saldo)) {
    return res.status(400).json({ error: 'Informe um saldo inicial válido.' })
  }

  garantirColunaAtivoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    `UPDATE conta
    SET descricao = ?,
      icone = ?,
      saldoInicial = ?,
      tipo_conta_id = ?,
      banco_id = ?
    WHERE id = ?`,
    [descricao.trim(), icone || null, saldo, tipo_conta_id || null, banco_id || null, req.params.id],
    function atualizarConta(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Conta não encontrada.' })
      }

      return db.get(
        `SELECT
          conta.id,
          conta.descricao,
          conta.saldoInicial,
          conta.saldoAtual,
          conta.ativo,
          conta.tipo_conta_id,
          tipo_conta.descricao AS tipo_conta,
          conta.banco_id,
          banco.nome AS banco,
          banco.imagem AS banco_imagem
        FROM conta
        LEFT JOIN tipo_conta ON tipo_conta.id = conta.tipo_conta_id
        LEFT JOIN banco ON banco.id = conta.banco_id
        WHERE conta.id = ?`,
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

routes.patch('/contas/:id/ativo', (req, res) => {
  const ativo = req.body.ativo ? 1 : 0

  garantirColunaAtivoConta((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run('UPDATE conta SET ativo = ? WHERE id = ?', [ativo, req.params.id], function atualizarStatus(error) {
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Conta não encontrada.' })
    }

    return res.json({ id: Number(req.params.id), ativo })
  })
  })
})
