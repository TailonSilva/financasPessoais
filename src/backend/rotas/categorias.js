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
