// Importa o Router para criar rotas separadas no Express.
import { Router } from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
// Importa a conexão com o banco SQLite.
import { db } from '../db.js'

// Cria e exporta o agrupador de rotas de bancos.
export const bancosRoutes = Router()
const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const uploadsPath = process.env.UPLOADS_PATH || path.join(dirname, '..', 'uploads')
const uploadsBancosPath = path.join(uploadsPath, 'bancos')

function garantirColunasBanco(callback) {
  db.all('PRAGMA table_info(banco)', (error, colunas) => {
    if (error) {
      callback(error)
      return
    }

    const temCor = colunas.some((coluna) => coluna.name === 'cor')
    const temAtivo = colunas.some((coluna) => coluna.name === 'ativo')
    const alteracoes = []

    if (!temCor) {
      alteracoes.push('ALTER TABLE banco ADD COLUMN cor TEXT')
    }

    if (!temAtivo) {
      alteracoes.push('ALTER TABLE banco ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1')
    }

    if (alteracoes.length === 0) {
      callback()
      return
    }

    function executarAlteracao(index = 0) {
      if (index >= alteracoes.length) {
        callback()
        return
      }

      db.run(alteracoes[index], (alterError) => {
        if (alterError) {
          callback(alterError)
          return
        }

        executarAlteracao(index + 1)
      })
    }

    executarAlteracao()
  })
}

bancosRoutes.post('/uploads/bancos', async (req, res) => {
  try {
    const { imagemBase64, nomeArquivo = 'logo-banco.png' } = req.body
    const match = /^data:image\/(png|jpeg|webp);base64,(.+)$/.exec(imagemBase64 || '')

    if (!match) {
      return res.status(400).json({ error: 'Envie uma imagem PNG, JPG ou WEBP válida.' })
    }

    const extensao = match[1] === 'jpeg' ? 'jpg' : match[1]
    const baseLimpa = path
      .parse(nomeArquivo)
      .name.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
    const nomeFinal = `${baseLimpa || 'logo-banco'}-${crypto.randomUUID()}.${extensao}`
    const caminhoFinal = path.join(uploadsBancosPath, nomeFinal)

    await fs.mkdir(uploadsBancosPath, { recursive: true })
    await fs.writeFile(caminhoFinal, Buffer.from(match[2], 'base64'))

    return res.status(201).json({
      arquivo: `uploads/bancos/${nomeFinal}`,
      url: `/uploads/bancos/${nomeFinal}`,
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

// Cria a rota GET que lista todos os bancos.
bancosRoutes.get('/bancos', (req, res) => {
  garantirColunasBanco((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  const incluirInativos = req.query.incluirInativos === '1'

  // Executa a consulta SQL buscando todos os bancos.
  db.all(
    // Seleciona todos os campos da tabela banco.
    `SELECT id, nome, imagem, cor, ativo FROM banco
    ${incluirInativos ? '' : 'WHERE ativo = 1'}
    ORDER BY id`,
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
})

bancosRoutes.post('/bancos', (req, res) => {
  const { nome, imagem = null, cor = null } = req.body

  if (!nome?.trim()) {
    return res.status(400).json({ error: 'Informe o nome do banco.' })
  }

  garantirColunasBanco((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    'INSERT INTO banco (nome, imagem, cor) VALUES (?, ?, ?)',
    [nome.trim(), imagem || null, cor || null],
    function inserirBanco(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      return db.get(
        'SELECT id, nome, imagem, cor, ativo FROM banco WHERE id = ?',
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

bancosRoutes.put('/bancos/:id', (req, res) => {
  const { nome, imagem = null, cor = null } = req.body

  if (!nome?.trim()) {
    return res.status(400).json({ error: 'Informe o nome do banco.' })
  }

  garantirColunasBanco((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run(
    'UPDATE banco SET nome = ?, imagem = ?, cor = ? WHERE id = ?',
    [nome.trim(), imagem || null, cor || null, req.params.id],
    function atualizarBanco(error) {
      if (error) {
        return res.status(500).json({ error: error.message })
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Banco não encontrado.' })
      }

      return db.get(
        'SELECT id, nome, imagem, cor, ativo FROM banco WHERE id = ?',
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

bancosRoutes.patch('/bancos/:id/ativo', (req, res) => {
  const ativo = req.body.ativo ? 1 : 0

  garantirColunasBanco((migrationError) => {
    if (migrationError) {
      return res.status(500).json({ error: migrationError.message })
    }

  db.run('UPDATE banco SET ativo = ? WHERE id = ?', [ativo, req.params.id], function atualizarStatus(error) {
    if (error) {
      return res.status(500).json({ error: error.message })
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Banco não encontrado.' })
    }

    return res.json({ id: Number(req.params.id), ativo })
  })
  })
})
