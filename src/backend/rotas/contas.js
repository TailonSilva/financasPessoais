// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de contas.
export const routes = Router()

// Cria a rota GET que lista todas as contas.
routes.get('/contas', (_req, res) => {
  // Executa a consulta SQL buscando as contas e seus relacionamentos.
  db.all(
    // Seleciona os campos principais da conta, do tipo de conta e do banco.
    `SELECT
      conta.id,
      conta.descricao,
      conta.saldoInicial,
      conta.saldoAtual,
      conta.tipo_conta_id,
      tipo_conta.descricao AS tipo_conta,
      conta.banco_id,
      banco.nome AS banco,
      banco.imagem AS banco_imagem
    FROM conta
    LEFT JOIN tipo_conta ON tipo_conta.id = conta.tipo_conta_id
    LEFT JOIN banco ON banco.id = conta.banco_id
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
