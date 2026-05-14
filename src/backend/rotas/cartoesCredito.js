import { Router } from 'express'
import { db } from '../db.js'

export const cartoesCreditoRoutes = Router()

const LANCAMENTOS_TABLE = '"lançamentos"'
const CENTAVO = 0.005

function all(sql, params = []) {
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

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error)
        return
      }

      resolve(row)
    })
  })
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function handleRun(error) {
      if (error) {
        reject(error)
        return
      }

      resolve(this)
    })
  })
}

function addMonths(mes, ano, quantidadeMeses) {
  const date = new Date(ano, mes - 1 + quantidadeMeses, 1)

  return {
    mes: date.getMonth() + 1,
    ano: date.getFullYear(),
  }
}

function formatDate(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

async function getTipoDespesaId() {
  const tipo = await get(
    "SELECT id FROM tipo_lancamentos WHERE descricao = 'Despesa' LIMIT 1",
  )

  if (!tipo) {
    throw new Error('Tipo de lançamento "Despesa" não encontrado.')
  }

  return tipo.id
}

async function garantirColunaLancamentoAjuste() {
  const tabela = await get(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'ajustes_fatura_cartao'",
  )

  if (tabela?.sql && !tabela.sql.includes("'pagamento'")) {
    await run('PRAGMA foreign_keys = OFF')
    await run('BEGIN TRANSACTION')

    try {
      await run(`CREATE TABLE ajustes_fatura_cartao_nova (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fatura_cartao_id INTEGER NOT NULL,
        descricao TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'estorno' CHECK (tipo IN ('estorno', 'ajuste', 'pagamento')),
        valor REAL NOT NULL,
        data_ajuste TEXT,
        lancamento_id INTEGER,
        FOREIGN KEY (fatura_cartao_id) REFERENCES faturas_cartao(id)
      )`)
      await run(`INSERT INTO ajustes_fatura_cartao_nova (
        id,
        fatura_cartao_id,
        descricao,
        tipo,
        valor,
        data_ajuste,
        lancamento_id
      ) SELECT
        id,
        fatura_cartao_id,
        descricao,
        tipo,
        valor,
        data_ajuste,
        lancamento_id
      FROM ajustes_fatura_cartao`)
      await run('DROP TABLE ajustes_fatura_cartao')
      await run('ALTER TABLE ajustes_fatura_cartao_nova RENAME TO ajustes_fatura_cartao')
      await run('COMMIT')
    } catch (error) {
      await run('ROLLBACK').catch(() => {})
      throw error
    } finally {
      await run('PRAGMA foreign_keys = ON')
    }

    return
  }

  const colunas = await all('PRAGMA table_info(ajustes_fatura_cartao)')
  const temColuna = colunas.some((coluna) => coluna.name === 'lancamento_id')

  if (!temColuna) {
    await run('ALTER TABLE ajustes_fatura_cartao ADD COLUMN lancamento_id INTEGER')
  }
}

async function getCategoriaCartaoId() {
  let categoria = await get(
    "SELECT id FROM categoria WHERE icone = 'credit-card' OR descricao LIKE 'Cart%' LIMIT 1",
  )

  if (!categoria) {
    const result = await run(
      "INSERT INTO categoria (descricao, icone, cor) VALUES ('Cartão de crédito', 'credit-card', '#3478dd')",
    )
    categoria = { id: result.lastID }
  }

  return categoria.id
}

async function criarLancamentoFatura({ cartao, fatura, categoriaId, tipoDespesaId, valorTotal }) {
  const dataVencimento = formatDate(
    fatura.ano_vencimento,
    fatura.mes_vencimento,
    fatura.dia_vencimento,
  )

  const result = await run(
    `INSERT INTO ${LANCAMENTOS_TABLE} (
      descricao,
      data_vencimento,
      data_pagamento,
      categoria_id,
      conta_id,
      valor,
      tipo_lancamento_id,
      dia_vencimento,
      mes_vencimento,
      ano_vencimento,
      conta_origem_id,
      conta_destino_id
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      `Fatura ${cartao.descricao} - ${String(fatura.mes_referencia).padStart(2, '0')}/${fatura.ano_referencia}`,
      dataVencimento,
      categoriaId,
      cartao.conta_id,
      valorTotal,
      tipoDespesaId,
      fatura.dia_vencimento,
      fatura.mes_vencimento,
      fatura.ano_vencimento,
      cartao.conta_id,
    ],
  )

  return result.lastID
}

async function criarFatura({ cartao, mesReferencia, anoReferencia }) {
  const fechamento = addMonths(mesReferencia, anoReferencia, 1)
  const vencimento = addMonths(mesReferencia, anoReferencia, 1)
  const categoriaId = await getCategoriaCartaoId()
  const tipoDespesaId = await getTipoDespesaId()

  const fatura = {
    cartao_id: cartao.id,
    mes_referencia: mesReferencia,
    ano_referencia: anoReferencia,
    dia_fechamento: cartao.dia_fechamento,
    mes_fechamento: fechamento.mes,
    ano_fechamento: fechamento.ano,
    dia_vencimento: cartao.dia_vencimento,
    mes_vencimento: vencimento.mes,
    ano_vencimento: vencimento.ano,
  }

  const lancamentoId = await criarLancamentoFatura({
    cartao,
    fatura,
    categoriaId,
    tipoDespesaId,
    valorTotal: 0,
  })

  const result = await run(
    `INSERT INTO faturas_cartao (
      cartao_id,
      mes_referencia,
      ano_referencia,
      dia_fechamento,
      mes_fechamento,
      ano_fechamento,
      dia_vencimento,
      mes_vencimento,
      ano_vencimento,
      valor_total,
      status,
      lancamento_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'aberta', ?)`,
    [
      fatura.cartao_id,
      fatura.mes_referencia,
      fatura.ano_referencia,
      fatura.dia_fechamento,
      fatura.mes_fechamento,
      fatura.ano_fechamento,
      fatura.dia_vencimento,
      fatura.mes_vencimento,
      fatura.ano_vencimento,
      lancamentoId,
    ],
  )

  return get('SELECT * FROM faturas_cartao WHERE id = ?', [result.lastID])
}

async function buscarOuCriarFatura({ cartao, mesReferencia, anoReferencia }) {
  const fatura = await get(
    `SELECT *
    FROM faturas_cartao
    WHERE cartao_id = ? AND mes_referencia = ? AND ano_referencia = ?`,
    [cartao.id, mesReferencia, anoReferencia],
  )

  if (fatura) {
    return fatura
  }

  return criarFatura({ cartao, mesReferencia, anoReferencia })
}

async function gerarFaturasMensaisDoCartao({
  cartao,
  anoReferencia,
  mesInicial = 1,
  quantidadeMeses = 12,
}) {
  const faturas = []

  for (let index = 0; index < quantidadeMeses; index += 1) {
    const referencia = addMonths(mesInicial, anoReferencia, index)
    const fatura = await buscarOuCriarFatura({
      cartao,
      mesReferencia: referencia.mes,
      anoReferencia: referencia.ano,
    })

    await atualizarValorFatura(fatura.id)
    faturas.push(await get('SELECT * FROM faturas_cartao WHERE id = ?', [fatura.id]))
  }

  return faturas
}

async function atualizarValorFatura(faturaId) {
  const total = await get(
    `SELECT
      COALESCE((
        SELECT SUM(valor_parcela)
        FROM parcelas_cartao
        WHERE fatura_cartao_id = ?
      ), 0) AS total_compras,
      COALESCE((
        SELECT SUM(valor)
        FROM ajustes_fatura_cartao
        WHERE fatura_cartao_id = ? AND tipo IN ('estorno', 'ajuste')
      ), 0) AS total_estornos,
      COALESCE((
        SELECT SUM(valor)
        FROM ajustes_fatura_cartao
        WHERE fatura_cartao_id = ? AND tipo = 'pagamento'
      ), 0) AS total_pagamentos,
      (
        SELECT MAX(data_ajuste)
        FROM ajustes_fatura_cartao
        WHERE fatura_cartao_id = ? AND tipo = 'pagamento'
      ) AS ultima_data_pagamento`,
    [faturaId, faturaId, faturaId, faturaId],
  )

  const valorTotal = Math.max(Number(total.total_compras) - Number(total.total_estornos), 0)
  const valorAberto = Math.max(valorTotal - Number(total.total_pagamentos), 0)
  const fatura = await get('SELECT * FROM faturas_cartao WHERE id = ?', [faturaId])

  await run('UPDATE faturas_cartao SET valor_total = ? WHERE id = ?', [
    valorTotal,
    faturaId,
  ])

  await reconciliarLancamentosPagamentoFatura({ faturaId, valorTotal })

  const pagamentosLancados = await get(
    `SELECT COALESCE(SUM(valor), 0) AS total
    FROM ajustes_fatura_cartao
    WHERE fatura_cartao_id = ? AND tipo = 'pagamento' AND lancamento_id IS NOT NULL`,
    [faturaId],
  )
  const valorLancamentoFatura =
    valorAberto <= CENTAVO
      ? Math.max(valorTotal - Number(pagamentosLancados.total || 0), 0)
      : valorAberto
  const dataPagamentoFatura =
    valorTotal > 0 && valorAberto <= 0
      ? total.ultima_data_pagamento || new Date().toISOString().slice(0, 10)
      : null

  if (fatura.lancamento_id) {
    await run(`UPDATE ${LANCAMENTOS_TABLE} SET valor = ?, data_pagamento = ? WHERE id = ?`, [
      valorLancamentoFatura,
      dataPagamentoFatura,
      fatura.lancamento_id,
    ])
  }
}

async function buscarParcelaCompletaPorId(id) {
  return get(
    `SELECT
      parcelas_cartao.*,
      compras_cartao.descricao,
      compras_cartao.categoria_id
    FROM parcelas_cartao
    LEFT JOIN compras_cartao ON compras_cartao.id = parcelas_cartao.compra_cartao_id
    WHERE parcelas_cartao.id = ?`,
    [id],
  )
}

async function listarFaturasDaCompra(compraCartaoId, numeroParcelaInicial = 1) {
  return all(
    `SELECT DISTINCT fatura_cartao_id
    FROM parcelas_cartao
    WHERE compra_cartao_id = ? AND numero_parcela >= ?`,
    [compraCartaoId, numeroParcelaInicial],
  )
}

async function buscarAjusteCompletoPorId(id) {
  return get(
    `SELECT
      ajustes_fatura_cartao.*,
      faturas_cartao.cartao_id,
      faturas_cartao.mes_referencia,
      faturas_cartao.ano_referencia,
      cartoes_credito.descricao AS cartao
    FROM ajustes_fatura_cartao
    LEFT JOIN faturas_cartao ON faturas_cartao.id = ajustes_fatura_cartao.fatura_cartao_id
    LEFT JOIN cartoes_credito ON cartoes_credito.id = faturas_cartao.cartao_id
    WHERE ajustes_fatura_cartao.id = ?`,
    [id],
  )
}

async function listarAjustesFaturaCartao({ incluirInativos = false } = {}) {
  return all(
    `SELECT
      ajustes_fatura_cartao.*,
      faturas_cartao.cartao_id,
      faturas_cartao.mes_referencia,
      faturas_cartao.ano_referencia,
      cartoes_credito.descricao AS cartao
    FROM ajustes_fatura_cartao
    LEFT JOIN faturas_cartao ON faturas_cartao.id = ajustes_fatura_cartao.fatura_cartao_id
    LEFT JOIN cartoes_credito ON cartoes_credito.id = faturas_cartao.cartao_id
    WHERE ${incluirInativos ? '1 = 1' : 'cartoes_credito.ativo = 1'}
    ORDER BY faturas_cartao.ano_referencia, faturas_cartao.mes_referencia, ajustes_fatura_cartao.id`,
  )
}

async function getFaturaPorId(id) {
  return get(
    `SELECT
      faturas_cartao.*,
      cartoes_credito.descricao AS cartao,
      cartoes_credito.conta_id
    FROM faturas_cartao
    LEFT JOIN cartoes_credito ON cartoes_credito.id = faturas_cartao.cartao_id
    WHERE faturas_cartao.id = ?`,
    [id],
  )
}

async function criarLancamentoPagamentoFatura({ fatura, descricao, valor, dataPagamento }) {
  const categoriaId = await getCategoriaCartaoId()
  const tipoDespesaId = await getTipoDespesaId()
  const dataBase = dataPagamento || new Date().toISOString().slice(0, 10)
  const [anoPagamento, mesPagamento, diaPagamento] = dataBase.split('-')

  const result = await run(
    `INSERT INTO ${LANCAMENTOS_TABLE} (
      descricao,
      data_vencimento,
      data_pagamento,
      categoria_id,
      conta_id,
      valor,
      tipo_lancamento_id,
      dia_vencimento,
      mes_vencimento,
      ano_vencimento,
      conta_origem_id,
      conta_destino_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    [
      descricao,
      dataBase,
      dataBase,
      categoriaId,
      fatura.conta_id,
      valor,
      tipoDespesaId,
      diaPagamento,
      mesPagamento,
      anoPagamento,
      fatura.conta_id,
    ],
  )

  return result.lastID
}

async function atualizarLancamentoPagamentoFatura({
  lancamentoId,
  descricao,
  valor,
  dataPagamento,
}) {
  const dataBase = dataPagamento || new Date().toISOString().slice(0, 10)
  const [anoPagamento, mesPagamento, diaPagamento] = dataBase.split('-')

  await run(
    `UPDATE ${LANCAMENTOS_TABLE}
    SET descricao = ?,
      valor = ?,
      data_vencimento = ?,
      data_pagamento = ?,
      dia_vencimento = ?,
      mes_vencimento = ?,
      ano_vencimento = ?
    WHERE id = ?`,
    [
      descricao,
      valor,
      dataBase,
      dataBase,
      diaPagamento,
      mesPagamento,
      anoPagamento,
      lancamentoId,
    ],
  )
}

async function reconciliarLancamentosPagamentoFatura({ faturaId, valorTotal }) {
  const fatura = await getFaturaPorId(faturaId)

  if (!fatura) {
    return
  }

  const pagamentos = await all(
    `SELECT *
    FROM ajustes_fatura_cartao
    WHERE fatura_cartao_id = ? AND tipo = 'pagamento'
    ORDER BY id`,
    [faturaId],
  )
  let totalPagoAntes = 0

  for (const pagamento of pagamentos) {
    const valorPagamento = Number(pagamento.valor || 0)
    const pagamentoParcial = totalPagoAntes + valorPagamento < Number(valorTotal) - CENTAVO

    if (pagamentoParcial) {
      if (pagamento.lancamento_id) {
        await atualizarLancamentoPagamentoFatura({
          lancamentoId: pagamento.lancamento_id,
          descricao: pagamento.descricao,
          valor: pagamento.valor,
          dataPagamento: pagamento.data_ajuste,
        })
      } else {
        const lancamentoId = await criarLancamentoPagamentoFatura({
          fatura,
          descricao: pagamento.descricao,
          valor: pagamento.valor,
          dataPagamento: pagamento.data_ajuste,
        })

        await run('UPDATE ajustes_fatura_cartao SET lancamento_id = ? WHERE id = ?', [
          lancamentoId,
          pagamento.id,
        ])
      }
    } else if (pagamento.lancamento_id) {
      await run(`DELETE FROM ${LANCAMENTOS_TABLE} WHERE id = ?`, [pagamento.lancamento_id])
      await run('UPDATE ajustes_fatura_cartao SET lancamento_id = NULL WHERE id = ?', [
        pagamento.id,
      ])
    }

    totalPagoAntes += valorPagamento
  }
}

function isDiaValido(dia) {
  return Number.isInteger(Number(dia)) && Number(dia) >= 1 && Number(dia) <= 31
}

async function buscarCartaoCompletoPorId(id) {
  return get(
    `SELECT
      cartoes_credito.id,
      cartoes_credito.descricao,
      cartoes_credito.conta_id,
      conta.descricao AS conta,
      banco.nome AS banco,
      banco.imagem AS banco_imagem,
      cartoes_credito.limite,
      cartoes_credito.dia_fechamento,
      cartoes_credito.dia_vencimento,
      cartoes_credito.ativo
    FROM cartoes_credito
    LEFT JOIN conta ON conta.id = cartoes_credito.conta_id
    LEFT JOIN banco ON banco.id = conta.banco_id
    WHERE cartoes_credito.id = ?`,
    [id],
  )
}

cartoesCreditoRoutes.get('/cartoes-credito', async (req, res) => {
  try {
    const incluirInativos = req.query.incluirInativos === '1'
    const rows = await all(
      `SELECT
        cartoes_credito.id,
        cartoes_credito.descricao,
        cartoes_credito.conta_id,
        conta.descricao AS conta,
        banco.nome AS banco,
        banco.imagem AS banco_imagem,
        cartoes_credito.limite,
        cartoes_credito.dia_fechamento,
        cartoes_credito.dia_vencimento,
        cartoes_credito.ativo
      FROM cartoes_credito
      LEFT JOIN conta ON conta.id = cartoes_credito.conta_id
      LEFT JOIN banco ON banco.id = conta.banco_id
      WHERE ${incluirInativos ? '1 = 1' : 'cartoes_credito.ativo = 1'}
        AND (${incluirInativos ? '1 = 1' : 'conta.id IS NULL OR conta.ativo = 1'})
        AND (${incluirInativos ? '1 = 1' : 'banco.id IS NULL OR banco.ativo = 1'})
      ORDER BY cartoes_credito.id`,
    )

    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.get('/cartoes-credito/:id', async (req, res) => {
  try {
    const cartao = await buscarCartaoCompletoPorId(req.params.id)

    if (!cartao) {
      return res.status(404).json({ error: 'Cartão de crédito não encontrado.' })
    }

    return res.json(cartao)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.post('/cartoes-credito', async (req, res) => {
  try {
    const { descricao, conta_id, limite, dia_fechamento, dia_vencimento, ativo = 1 } = req.body

    if (!descricao || !conta_id || !limite || !dia_fechamento || !dia_vencimento) {
      return res.status(400).json({
        error: 'Informe descricao, conta_id, limite, dia_fechamento e dia_vencimento.',
      })
    }

    if (Number(limite) <= 0) {
      return res.status(400).json({ error: 'O limite deve ser maior que zero.' })
    }

    if (!isDiaValido(dia_fechamento) || !isDiaValido(dia_vencimento)) {
      return res.status(400).json({
        error: 'dia_fechamento e dia_vencimento devem estar entre 1 e 31.',
      })
    }

    const conta = await get('SELECT id FROM conta WHERE id = ?', [conta_id])

    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada.' })
    }

    const result = await run(
      `INSERT INTO cartoes_credito (
        descricao,
        conta_id,
        limite,
        dia_fechamento,
        dia_vencimento,
        ativo
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [descricao, conta_id, limite, dia_fechamento, dia_vencimento, ativo],
    )

    const cartao = await buscarCartaoCompletoPorId(result.lastID)
    await gerarFaturasMensaisDoCartao({
      cartao,
      anoReferencia: new Date().getFullYear(),
    })

    return res.status(201).json(cartao)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.put('/cartoes-credito/:id', async (req, res) => {
  try {
    const { descricao, conta_id, limite, dia_fechamento, dia_vencimento, ativo = 1 } = req.body

    if (!descricao || !conta_id || !limite || !dia_fechamento || !dia_vencimento) {
      return res.status(400).json({
        error: 'Informe descricao, conta_id, limite, dia_fechamento e dia_vencimento.',
      })
    }

    if (Number(limite) <= 0) {
      return res.status(400).json({ error: 'O limite deve ser maior que zero.' })
    }

    if (!isDiaValido(dia_fechamento) || !isDiaValido(dia_vencimento)) {
      return res.status(400).json({
        error: 'dia_fechamento e dia_vencimento devem estar entre 1 e 31.',
      })
    }

    const conta = await get('SELECT id FROM conta WHERE id = ?', [conta_id])

    if (!conta) {
      return res.status(404).json({ error: 'Conta não encontrada.' })
    }

    const result = await run(
      `UPDATE cartoes_credito
      SET descricao = ?,
        conta_id = ?,
        limite = ?,
        dia_fechamento = ?,
        dia_vencimento = ?,
        ativo = ?
      WHERE id = ?`,
      [descricao, conta_id, limite, dia_fechamento, dia_vencimento, ativo, req.params.id],
    )

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cartão de crédito não encontrado.' })
    }

    const cartao = await buscarCartaoCompletoPorId(req.params.id)

    return res.json(cartao)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.patch('/cartoes-credito/:id/ativo', async (req, res) => {
  try {
    const ativo = req.body.ativo ? 1 : 0
    const result = await run('UPDATE cartoes_credito SET ativo = ? WHERE id = ?', [
      ativo,
      req.params.id,
    ])

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Cartão de crédito não encontrado.' })
    }

    return res.json({ id: Number(req.params.id), ativo })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.get('/faturas-cartao', async (req, res) => {
  try {
    const incluirInativos = req.query.incluirInativos === '1'
    const faturas = await all('SELECT id FROM faturas_cartao')

    for (const fatura of faturas) {
      await atualizarValorFatura(fatura.id)
    }

    const rows = await all(
      `SELECT
        faturas_cartao.*,
        COALESCE((
          SELECT SUM(valor)
          FROM ajustes_fatura_cartao
          WHERE ajustes_fatura_cartao.fatura_cartao_id = faturas_cartao.id
            AND ajustes_fatura_cartao.tipo = 'pagamento'
        ), 0) AS valor_pago,
        MAX(
          faturas_cartao.valor_total - COALESCE((
            SELECT SUM(valor)
            FROM ajustes_fatura_cartao
            WHERE ajustes_fatura_cartao.fatura_cartao_id = faturas_cartao.id
              AND ajustes_fatura_cartao.tipo = 'pagamento'
          ), 0),
          0
        ) AS valor_aberto,
        CASE
          WHEN date(
            printf('%04d-%02d-%02d', faturas_cartao.ano_fechamento, faturas_cartao.mes_fechamento, faturas_cartao.dia_fechamento)
          ) < date('now', 'localtime') THEN 'fechada'
          ELSE faturas_cartao.status
        END AS status,
        cartoes_credito.descricao AS cartao,
        conta.descricao AS conta_pagamento,
        banco.nome AS banco,
        banco.imagem AS banco_imagem,
        mes_referencia.descricao AS mes_referencia_descricao,
        mes_fechamento.descricao AS mes_fechamento_descricao,
        mes_vencimento.descricao AS mes_vencimento_descricao
      FROM faturas_cartao
      LEFT JOIN cartoes_credito ON cartoes_credito.id = faturas_cartao.cartao_id
      LEFT JOIN conta ON conta.id = cartoes_credito.conta_id
      LEFT JOIN banco ON banco.id = conta.banco_id
      LEFT JOIN meses AS mes_referencia ON mes_referencia.id = faturas_cartao.mes_referencia
      LEFT JOIN meses AS mes_fechamento ON mes_fechamento.id = faturas_cartao.mes_fechamento
      LEFT JOIN meses AS mes_vencimento ON mes_vencimento.id = faturas_cartao.mes_vencimento
      WHERE ${incluirInativos ? '1 = 1' : 'cartoes_credito.ativo = 1'}
        AND (${incluirInativos ? '1 = 1' : 'conta.id IS NULL OR conta.ativo = 1'})
        AND (${incluirInativos ? '1 = 1' : 'banco.id IS NULL OR banco.ativo = 1'})
      ORDER BY faturas_cartao.ano_referencia, faturas_cartao.mes_referencia, faturas_cartao.cartao_id`,
    )

    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.post('/faturas-cartao/gerar-mensais', async (req, res) => {
  try {
    const {
      ano = new Date().getFullYear(),
      mes_inicial = 1,
      quantidade_meses = 12,
      cartao_id = null,
    } = req.body ?? {}

    if (!Number.isInteger(Number(ano))) {
      return res.status(400).json({ error: 'Informe um ano válido.' })
    }

    if (
      !Number.isInteger(Number(mes_inicial)) ||
      Number(mes_inicial) < 1 ||
      Number(mes_inicial) > 12
    ) {
      return res.status(400).json({ error: 'mes_inicial deve estar entre 1 e 12.' })
    }

    if (!Number.isInteger(Number(quantidade_meses)) || Number(quantidade_meses) <= 0) {
      return res.status(400).json({ error: 'quantidade_meses deve ser maior que zero.' })
    }

    const cartoes = cartao_id
      ? await all('SELECT * FROM cartoes_credito WHERE id = ?', [cartao_id])
      : await all('SELECT * FROM cartoes_credito WHERE ativo = 1 ORDER BY id')

    if (cartao_id && cartoes.length === 0) {
      return res.status(404).json({ error: 'Cartão de crédito não encontrado.' })
    }

    const resultado = []

    for (const cartao of cartoes) {
      const faturas = await gerarFaturasMensaisDoCartao({
        cartao,
        anoReferencia: Number(ano),
        mesInicial: Number(mes_inicial),
        quantidadeMeses: Number(quantidade_meses),
      })

      resultado.push({
        cartao_id: cartao.id,
        cartao: cartao.descricao,
        faturas: faturas.length,
      })
    }

    return res.status(201).json(resultado)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.get('/ajustes-fatura-cartao', async (req, res) => {
  try {
    const rows = await listarAjustesFaturaCartao({
      incluirInativos: req.query.incluirInativos === '1',
    })

    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.post('/ajustes-fatura-cartao', async (req, res) => {
  try {
    const {
      fatura_cartao_id,
      descricao,
      tipo = 'estorno',
      valor,
      data_ajuste = null,
    } = req.body

    if (!fatura_cartao_id || !descricao?.trim() || !valor) {
      return res.status(400).json({
        error: 'Informe fatura_cartao_id, descricao e valor.',
      })
    }

    if (!['estorno', 'ajuste', 'pagamento'].includes(tipo)) {
      return res.status(400).json({
        error: 'O tipo deve ser estorno, ajuste ou pagamento.',
      })
    }

    if (Number(valor) <= 0) {
      return res.status(400).json({
        error: 'O valor deve ser maior que zero.',
      })
    }

    const faturaExiste = await getFaturaPorId(fatura_cartao_id)

    if (!faturaExiste) {
      return res.status(404).json({ error: 'Fatura não encontrada.' })
    }

    await garantirColunaLancamentoAjuste()

    const result = await run(
      `INSERT INTO ajustes_fatura_cartao (
        fatura_cartao_id,
        descricao,
        tipo,
        valor,
        data_ajuste,
        lancamento_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [fatura_cartao_id, descricao.trim(), tipo, valor, data_ajuste, null],
    )

    await atualizarValorFatura(fatura_cartao_id)

    const ajuste = await buscarAjusteCompletoPorId(result.lastID)

    return res.status(201).json(ajuste)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.put('/ajustes-fatura-cartao/:id', async (req, res) => {
  try {
    const { descricao, valor, data_ajuste = null } = req.body

    if (!descricao?.trim() || !valor || Number(valor) <= 0) {
      return res.status(400).json({ error: 'Informe descricao e valor maior que zero.' })
    }

    const ajuste = await get('SELECT * FROM ajustes_fatura_cartao WHERE id = ?', [req.params.id])

    if (!ajuste) {
      return res.status(404).json({ error: 'LanÃ§amento da fatura nÃ£o encontrado.' })
    }

    await run(
      `UPDATE ajustes_fatura_cartao
      SET descricao = ?, valor = ?, data_ajuste = ?
      WHERE id = ?`,
      [descricao.trim(), valor, data_ajuste, req.params.id],
    )

    await atualizarValorFatura(ajuste.fatura_cartao_id)

    return res.json(await buscarAjusteCompletoPorId(req.params.id))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.delete('/ajustes-fatura-cartao/:id', async (req, res) => {
  try {
    const ajuste = await get('SELECT * FROM ajustes_fatura_cartao WHERE id = ?', [req.params.id])

    if (!ajuste) {
      return res.status(404).json({ error: 'LanÃ§amento da fatura nÃ£o encontrado.' })
    }

    await run('BEGIN TRANSACTION')

    try {
      await run('DELETE FROM ajustes_fatura_cartao WHERE id = ?', [req.params.id])

      if (ajuste.lancamento_id) {
        await run(`DELETE FROM ${LANCAMENTOS_TABLE} WHERE id = ?`, [ajuste.lancamento_id])
      }

      await atualizarValorFatura(ajuste.fatura_cartao_id)
      await run('COMMIT')
    } catch (error) {
      await run('ROLLBACK')
      throw error
    }

    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.get('/compras-cartao', async (req, res) => {
  try {
    const incluirInativos = req.query.incluirInativos === '1'
    const rows = await all(
      `SELECT
        compras_cartao.*,
        cartoes_credito.descricao AS cartao,
        categoria.descricao AS categoria,
        meses.descricao AS primeira_fatura_mes_descricao
      FROM compras_cartao
      LEFT JOIN cartoes_credito ON cartoes_credito.id = compras_cartao.cartao_id
      LEFT JOIN categoria ON categoria.id = compras_cartao.categoria_id
      LEFT JOIN meses ON meses.id = compras_cartao.primeira_fatura_mes
      WHERE ${incluirInativos ? '1 = 1' : 'cartoes_credito.ativo = 1'}
        AND (${incluirInativos ? '1 = 1' : 'categoria.id IS NULL OR categoria.ativo = 1'})
      ORDER BY compras_cartao.ano_compra, compras_cartao.mes_compra, compras_cartao.dia_compra, compras_cartao.id`,
    )

    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.get('/parcelas-cartao', async (req, res) => {
  try {
    const incluirInativos = req.query.incluirInativos === '1'
    const rows = await all(
      `SELECT
        parcelas_cartao.*,
        compras_cartao.descricao AS compra,
        compras_cartao.categoria_id,
        categoria.descricao AS categoria,
        faturas_cartao.mes_referencia,
        faturas_cartao.ano_referencia,
        faturas_cartao.dia_vencimento,
        faturas_cartao.mes_vencimento,
        faturas_cartao.ano_vencimento,
        COALESCE((
          SELECT SUM(valor)
          FROM ajustes_fatura_cartao
          WHERE ajustes_fatura_cartao.fatura_cartao_id = faturas_cartao.id
            AND ajustes_fatura_cartao.tipo = 'pagamento'
        ), 0) AS fatura_valor_pago,
        MAX(
          faturas_cartao.valor_total - COALESCE((
            SELECT SUM(valor)
            FROM ajustes_fatura_cartao
            WHERE ajustes_fatura_cartao.fatura_cartao_id = faturas_cartao.id
              AND ajustes_fatura_cartao.tipo = 'pagamento'
          ), 0),
          0
        ) AS fatura_valor_aberto,
        cartoes_credito.descricao AS cartao
      FROM parcelas_cartao
      LEFT JOIN compras_cartao ON compras_cartao.id = parcelas_cartao.compra_cartao_id
      LEFT JOIN categoria ON categoria.id = compras_cartao.categoria_id
      LEFT JOIN faturas_cartao ON faturas_cartao.id = parcelas_cartao.fatura_cartao_id
      LEFT JOIN cartoes_credito ON cartoes_credito.id = faturas_cartao.cartao_id
      WHERE ${incluirInativos ? '1 = 1' : 'cartoes_credito.ativo = 1'}
        AND (${incluirInativos ? '1 = 1' : 'categoria.id IS NULL OR categoria.ativo = 1'})
      ORDER BY faturas_cartao.ano_referencia, faturas_cartao.mes_referencia, parcelas_cartao.numero_parcela`,
    )

    return res.json(rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.put('/parcelas-cartao/:id', async (req, res) => {
  try {
    const {
      descricao,
      categoria_id = null,
      valor_parcela,
      escopo = 'atual',
    } = req.body

    if (!valor_parcela || Number(valor_parcela) <= 0) {
      return res.status(400).json({ error: 'Informe um valor maior que zero.' })
    }

    const parcela = await buscarParcelaCompletaPorId(req.params.id)

    if (!parcela) {
      return res.status(404).json({ error: 'Parcela nÃ£o encontrada.' })
    }

    const aplicarFuturo = escopo === 'futuro'
    const faturasAfetadas = aplicarFuturo
      ? await listarFaturasDaCompra(parcela.compra_cartao_id, parcela.numero_parcela)
      : [{ fatura_cartao_id: parcela.fatura_cartao_id }]

    await run('BEGIN TRANSACTION')

    try {
      if (aplicarFuturo || Number(parcela.total_parcelas) === 1) {
        await run(
          'UPDATE compras_cartao SET descricao = ?, categoria_id = ? WHERE id = ?',
          [descricao?.trim() || parcela.descricao, categoria_id || null, parcela.compra_cartao_id],
        )
      }

      if (aplicarFuturo) {
        await run(
          `UPDATE parcelas_cartao
          SET valor_parcela = ?
          WHERE compra_cartao_id = ? AND numero_parcela >= ?`,
          [valor_parcela, parcela.compra_cartao_id, parcela.numero_parcela],
        )
      } else {
        await run('UPDATE parcelas_cartao SET valor_parcela = ? WHERE id = ?', [
          valor_parcela,
          parcela.id,
        ])
      }

      for (const fatura of faturasAfetadas) {
        await atualizarValorFatura(fatura.fatura_cartao_id)
      }

      await run('COMMIT')
    } catch (error) {
      await run('ROLLBACK')
      throw error
    }

    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.delete('/parcelas-cartao/:id', async (req, res) => {
  try {
    const escopo = req.query.escopo || 'atual'
    const parcela = await buscarParcelaCompletaPorId(req.params.id)

    if (!parcela) {
      return res.status(404).json({ error: 'Parcela nÃ£o encontrada.' })
    }

    const aplicarFuturo = escopo === 'futuro'
    const faturasAfetadas = aplicarFuturo
      ? await listarFaturasDaCompra(parcela.compra_cartao_id, parcela.numero_parcela)
      : [{ fatura_cartao_id: parcela.fatura_cartao_id }]

    await run('BEGIN TRANSACTION')

    try {
      if (aplicarFuturo) {
        await run(
          'DELETE FROM parcelas_cartao WHERE compra_cartao_id = ? AND numero_parcela >= ?',
          [parcela.compra_cartao_id, parcela.numero_parcela],
        )
      } else {
        await run('DELETE FROM parcelas_cartao WHERE id = ?', [parcela.id])
      }

      const restantes = await get(
        'SELECT COUNT(*) AS total FROM parcelas_cartao WHERE compra_cartao_id = ?',
        [parcela.compra_cartao_id],
      )

      if (Number(restantes.total) === 0) {
        await run('DELETE FROM compras_cartao WHERE id = ?', [parcela.compra_cartao_id])
      }

      for (const fatura of faturasAfetadas) {
        await atualizarValorFatura(fatura.fatura_cartao_id)
      }

      await run('COMMIT')
    } catch (error) {
      await run('ROLLBACK')
      throw error
    }

    return res.json({ ok: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})

cartoesCreditoRoutes.post('/compras-cartao', async (req, res) => {
  try {
    const {
      cartao_id,
      descricao,
      categoria_id,
      valor_total,
      valor_parcela,
      quantidade_parcelas = 1,
      primeira_fatura_mes,
      primeira_fatura_ano,
      dia_compra = null,
      mes_compra = null,
      ano_compra = null,
    } = req.body

    const valorParcela = Number(valor_parcela || valor_total)
    const quantidadeParcelas = Number(quantidade_parcelas)
    const valorTotalCompra = valorParcela * quantidadeParcelas

    if (
      !cartao_id ||
      !descricao?.trim() ||
      !valorParcela ||
      !quantidade_parcelas ||
      !primeira_fatura_mes ||
      !primeira_fatura_ano
    ) {
      return res.status(400).json({
        error:
          'Informe cartao_id, descricao, valor_parcela, quantidade_parcelas, primeira_fatura_mes e primeira_fatura_ano.',
      })
    }

    if (Number.isNaN(valorParcela) || valorParcela <= 0) {
      return res.status(400).json({ error: 'O valor da parcela deve ser maior que zero.' })
    }

    if (!Number.isInteger(quantidadeParcelas) || quantidadeParcelas <= 0) {
      return res.status(400).json({ error: 'A quantidade de parcelas deve ser maior que zero.' })
    }

    const cartao = await get('SELECT * FROM cartoes_credito WHERE id = ?', [cartao_id])

    if (!cartao) {
      return res.status(404).json({ error: 'Cartão de crédito não encontrado.' })
    }

    await run('BEGIN TRANSACTION')

    try {
      const compraResult = await run(
        `INSERT INTO compras_cartao (
          cartao_id,
          descricao,
          categoria_id,
          valor_total,
          quantidade_parcelas,
          primeira_fatura_mes,
          primeira_fatura_ano,
          dia_compra,
          mes_compra,
          ano_compra
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cartao_id,
          descricao.trim(),
          categoria_id ?? null,
          valorTotalCompra,
          quantidadeParcelas,
          primeira_fatura_mes,
          primeira_fatura_ano,
          dia_compra,
          mes_compra,
          ano_compra,
        ],
      )

      const faturasAfetadas = new Set()

      for (let index = 0; index < quantidadeParcelas; index += 1) {
        const referencia = addMonths(primeira_fatura_mes, primeira_fatura_ano, index)
        const fatura = await buscarOuCriarFatura({
          cartao,
          mesReferencia: referencia.mes,
          anoReferencia: referencia.ano,
        })

        await run(
          `INSERT INTO parcelas_cartao (
            compra_cartao_id,
            fatura_cartao_id,
            numero_parcela,
            total_parcelas,
            valor_parcela
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            compraResult.lastID,
            fatura.id,
            index + 1,
            quantidadeParcelas,
            valorParcela,
          ],
        )

        faturasAfetadas.add(fatura.id)
      }

      for (const faturaId of faturasAfetadas) {
        await atualizarValorFatura(faturaId)
      }

      await run('COMMIT')

      const compra = await get('SELECT * FROM compras_cartao WHERE id = ?', [compraResult.lastID])
      const parcelas = await all(
        `SELECT
          parcelas_cartao.*,
          faturas_cartao.mes_referencia,
          faturas_cartao.ano_referencia
        FROM parcelas_cartao
        LEFT JOIN faturas_cartao ON faturas_cartao.id = parcelas_cartao.fatura_cartao_id
        WHERE parcelas_cartao.compra_cartao_id = ?
        ORDER BY parcelas_cartao.numero_parcela`,
        [compraResult.lastID],
      )

      return res.status(201).json({ compra, parcelas })
    } catch (error) {
      await run('ROLLBACK')
      throw error
    }
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
})
