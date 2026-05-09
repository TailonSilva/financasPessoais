// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de bancos.
export const bancosRoutes = Router()

// Cria a rota GET que lista todos os bancos.
bancosRoutes.get('/bancos', (_req, res) => {
  // Executa a consulta SQL buscando todos os bancos.
  db.all(
    // Seleciona todos os campos da tabela banco.
    'SELECT id, nome, imagem FROM banco ORDER BY id',
    // Recebe erro ou resultado da consulta.
    (error, rows) => {
      // Se houver erro, retorna status 500 com a mensagem.
      if (error) {
        // Envia o erro em formato JSON.
        return res.status(500).json({ error: error.message })
      }

      // Se não houver erro, retorna a lista de bancos.
      return res.json(rows)
    },
  )
})
