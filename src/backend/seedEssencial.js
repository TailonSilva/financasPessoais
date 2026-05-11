const mesesEssenciais = [
  [1, 'Janeiro'],
  [2, 'Fevereiro'],
  [3, 'Março'],
  [4, 'Abril'],
  [5, 'Maio'],
  [6, 'Junho'],
  [7, 'Julho'],
  [8, 'Agosto'],
  [9, 'Setembro'],
  [10, 'Outubro'],
  [11, 'Novembro'],
  [12, 'Dezembro'],
]

const tiposLancamentoEssenciais = ['Receita', 'Despesa', 'Transferência']

const tiposContaEssenciais = ['Conta Corrente', 'Poupança', 'Investimento']

const categoriasEssenciais = [
  ['Alimentação', 'utensils', '#22c55e'],
  ['Transporte', 'car', '#3b82f6'],
  ['Moradia', 'home', '#f97316'],
  ['Saúde', 'heart-pulse', '#ef4444'],
  ['Educação', 'book-open', '#8b5cf6'],
  ['Salário', 'wallet', '#14b8a6'],
  ['Investimentos', 'trending-up', '#eab308'],
  ['Cartão de crédito', 'credit-card', '#3478dd'],
]

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function executar(error) {
      if (error) {
        reject(error)
        return
      }

      resolve(this)
    })
  })
}

function get(db, sql, params = []) {
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

async function tabelaExiste(db, tabela) {
  const row = await get(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tabela],
  )

  return Boolean(row)
}

async function colunaExiste(db, tabela, coluna) {
  const row = await get(db, `SELECT COUNT(*) AS total FROM pragma_table_info('${tabela}') WHERE name = ?`, [
    coluna,
  ])

  return Number(row?.total) > 0
}

async function inserirSeNaoExiste(db, tabela, coluna, valor, sqlInsert, params) {
  const row = await get(db, `SELECT id FROM ${tabela} WHERE ${coluna} = ? LIMIT 1`, [valor])

  if (!row) {
    await run(db, sqlInsert, params)
  }
}

export async function garantirDadosEssenciais(db) {
  if (await tabelaExiste(db, 'meses')) {
    for (const mes of mesesEssenciais) {
      await run(db, 'INSERT OR IGNORE INTO meses (id, descricao) VALUES (?, ?)', mes)
    }
  }

  if (await tabelaExiste(db, 'tipo_lancamentos')) {
    for (const tipo of tiposLancamentoEssenciais) {
      await inserirSeNaoExiste(
        db,
        'tipo_lancamentos',
        'descricao',
        tipo,
        'INSERT INTO tipo_lancamentos (descricao) VALUES (?)',
        [tipo],
      )
    }
  }

  if (await tabelaExiste(db, 'tipo_conta')) {
    const temAtivo = await colunaExiste(db, 'tipo_conta', 'ativo')

    for (const tipo of tiposContaEssenciais) {
      await inserirSeNaoExiste(
        db,
        'tipo_conta',
        'descricao',
        tipo,
        temAtivo
          ? 'INSERT INTO tipo_conta (descricao, ativo) VALUES (?, 1)'
          : 'INSERT INTO tipo_conta (descricao) VALUES (?)',
        [tipo],
      )
    }
  }

  if (await tabelaExiste(db, 'categoria')) {
    const temAtivo = await colunaExiste(db, 'categoria', 'ativo')

    for (const [descricao, icone, cor] of categoriasEssenciais) {
      await inserirSeNaoExiste(
        db,
        'categoria',
        'descricao',
        descricao,
        temAtivo
          ? 'INSERT INTO categoria (descricao, icone, cor, ativo) VALUES (?, ?, ?, 1)'
          : 'INSERT INTO categoria (descricao, icone, cor) VALUES (?, ?, ?)',
        [descricao, icone, cor],
      )
    }
  }
}
