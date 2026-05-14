import { useEffect, useMemo, useState } from 'react'
import { AnoSelector, MesSelector, PageHeader } from '../componentes/PageHeader'
import { fetchCategorias, fetchContas } from '../utilitarios/fetch/cadastros'
import { fetchParcelasCartao } from '../utilitarios/fetch/faturasCartao'
import { fetchLancamentos } from '../utilitarios/fetch/lancamentos'
import { formatarMoeda } from '../utilitarios/formatarMoeda'
import { useNotificacoes } from '../componentes/notificacoesContext'

const mesesResumo = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const coresGraficoCategorias = [
  '#1e96f2',
  '#18a661',
  '#e54b3f',
  '#f7b801',
  '#3478dd',
  '#8a5cf6',
  '#00a6a6',
  '#ef7b45',
  '#5b677a',
  '#d95f9f',
]

function somarLancamentos(lancamentos, tipo) {
  return lancamentos
    .filter((lancamento) => lancamento.tipo_lancamento === tipo)
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)
}

function isCategoriaCartaoCredito(categoria) {
  const descricao = categoria?.descricao?.toLowerCase() || ''

  return (
    categoria?.icone === 'credit-card' ||
    descricao.includes('cartão de crédito') ||
    descricao.includes('cartao de credito')
  )
}

function isContaInvestimento(conta) {
  const tipoConta = `${conta?.tipo_conta || ''}`.toLowerCase()

  return tipoConta.includes('invest')
}

function isLancamentoEmContaInvestimento(lancamento, contasInvestimentoIds) {
  if (contasInvestimentoIds.size === 0) {
    return false
  }

  if (lancamento.tipo_lancamento === 'Transferência') {
    return (
      contasInvestimentoIds.has(Number(lancamento.conta_origem_id)) ||
      contasInvestimentoIds.has(Number(lancamento.conta_destino_id))
    )
  }

  return contasInvestimentoIds.has(Number(lancamento.conta_id))
}

function getCategoriaLancamento(categoriasPorId, item) {
  const categoriaId = Number(item.categoria_id || 0)
  const categoria = categoriasPorId.get(categoriaId)

  return {
    categoria,
    categoriaId,
    nome: categoria?.descricao || item.categoria || 'Sem categoria',
  }
}

function adicionarValorCategoria(resumoPorCategoria, categoriasPorId, item, mes, valor) {
  const { categoria, categoriaId, nome } = getCategoriaLancamento(categoriasPorId, item)

  if (mes < 1 || mes > 12 || isCategoriaCartaoCredito(categoria)) {
    return
  }

  const chave = categoriaId || `sem-categoria-${nome}`

  if (!resumoPorCategoria.has(chave)) {
    resumoPorCategoria.set(chave, {
      categoria: nome,
      meses: Array.from({ length: 12 }, () => 0),
      total: 0,
    })
  }

  const resumo = resumoPorCategoria.get(chave)
  resumo.meses[mes - 1] += valor
  resumo.total += valor
}

function getAnoCompetenciaParcelaCartao(parcela) {
  return Number(parcela.ano_vencimento ?? parcela.ano_referencia)
}

function getMesCompetenciaParcelaCartao(parcela) {
  return Number(parcela.mes_vencimento ?? parcela.mes_referencia)
}

function getDiaCompetenciaParcelaCartao(parcela) {
  return Number(parcela.dia_vencimento ?? 1)
}

function isParcelaCartaoNoPeriodo(parcela, ano, mes) {
  return (
    getAnoCompetenciaParcelaCartao(parcela) === Number(ano) &&
    getMesCompetenciaParcelaCartao(parcela) === Number(mes)
  )
}

function isFaturaParcelaCartaoPaga(parcela) {
  return Number(parcela.fatura_valor_aberto ?? 1) <= 0
}

function formatarDescricaoParcelaCartao(parcela) {
  const descricao = parcela.compra || 'Compra no cart\u00e3o'

  if (Number(parcela.total_parcelas || 1) <= 1) {
    return descricao
  }

  return `${descricao} (${parcela.numero_parcela}/${parcela.total_parcelas})`
}

function montarResumoCategorias(categorias, lancamentos, ano, tipo) {
  const lancamentosDoTipo = lancamentos.filter(
    (lancamento) =>
      lancamento.tipo_lancamento === tipo &&
      Number(lancamento.ano_vencimento) === ano,
  )
  const categoriasPorId = new Map(categorias.map((categoria) => [Number(categoria.id), categoria]))
  const resumoPorCategoria = new Map()

  lancamentosDoTipo.forEach((lancamento) => {
    const categoriaId = Number(lancamento.categoria_id || 0)
    const mes = Number(lancamento.mes_vencimento)

    if (!categoriaId || mes < 1 || mes > 12) {
      return
    }

    if (!resumoPorCategoria.has(categoriaId)) {
      const categoria = categoriasPorId.get(categoriaId)

      resumoPorCategoria.set(categoriaId, {
        categoria: categoria?.descricao || lancamento.categoria || 'Sem categoria',
        meses: Array.from({ length: 12 }, () => 0),
        total: 0,
      })
    }

    const resumo = resumoPorCategoria.get(categoriaId)
    const valor = Number(lancamento.valor || 0)
    resumo.meses[mes - 1] += valor
    resumo.total += valor
  })

  return Array.from(resumoPorCategoria.values()).sort((categoriaA, categoriaB) =>
    categoriaA.categoria.localeCompare(categoriaB.categoria, 'pt-BR'),
  )
}

function montarResumoDespesasCategorias(categorias, lancamentos, parcelasCartao, ano) {
  const categoriasPorId = new Map(categorias.map((categoria) => [Number(categoria.id), categoria]))
  const resumoPorCategoria = new Map()

  lancamentos
    .filter(
      (lancamento) =>
        lancamento.tipo_lancamento === 'Despesa' &&
        Number(lancamento.ano_vencimento) === ano,
    )
    .forEach((lancamento) => {
      adicionarValorCategoria(
        resumoPorCategoria,
        categoriasPorId,
        lancamento,
        Number(lancamento.mes_vencimento),
        Number(lancamento.valor || 0),
      )
    })

  parcelasCartao
    .filter((parcela) => getAnoCompetenciaParcelaCartao(parcela) === ano)
    .forEach((parcela) => {
      adicionarValorCategoria(
        resumoPorCategoria,
        categoriasPorId,
        parcela,
        getMesCompetenciaParcelaCartao(parcela),
        Number(parcela.valor_parcela || 0),
      )
    })

  return Array.from(resumoPorCategoria.values()).sort((categoriaA, categoriaB) =>
    categoriaA.categoria.localeCompare(categoriaB.categoria, 'pt-BR'),
  )
}

function somarResumoMensal(resumoCategorias) {
  return resumoCategorias.reduce(
    (totais, categoria) => {
      categoria.meses.forEach((valor, index) => {
        totais.meses[index] += valor
      })
      totais.total += categoria.total

      return totais
    },
    {
      meses: Array.from({ length: 12 }, () => 0),
      total: 0,
    },
  )
}

function montarRankingDespesasMensal(categorias, lancamentos, parcelasCartao, ano, mes) {
  const categoriasPorId = new Map(categorias.map((categoria) => [Number(categoria.id), categoria]))
  const despesasDoMes = lancamentos.filter(
    (lancamento) =>
      lancamento.tipo_lancamento === 'Despesa' &&
      Number(lancamento.ano_vencimento) === ano &&
      Number(lancamento.mes_vencimento) === mes,
  )
  const rankingPorCategoria = new Map()

  function adicionarRanking(item, valor) {
    const { categoria, categoriaId, nome } = getCategoriaLancamento(categoriasPorId, item)

    if (isCategoriaCartaoCredito(categoria)) {
      return
    }

    const chave = categoriaId || `sem-categoria-${nome}`

    if (!rankingPorCategoria.has(chave)) {
      rankingPorCategoria.set(chave, {
        categoria: nome,
        cor: categoria?.cor || null,
        realizado: 0,
      })
    }

    rankingPorCategoria.get(chave).realizado += valor
  }

  despesasDoMes.forEach((lancamento) => {
    adicionarRanking(lancamento, Number(lancamento.valor || 0))
  })

  parcelasCartao
    .filter((parcela) => isParcelaCartaoNoPeriodo(parcela, ano, mes))
    .forEach((parcela) => {
      adicionarRanking(parcela, Number(parcela.valor_parcela || 0))
    })

  const ranking = Array.from(rankingPorCategoria.values())
  const totalRealizado = ranking.reduce((total, item) => total + item.realizado, 0)

  return {
    itens: ranking
      .filter((item) => item.realizado > 0)
      .map((item) => ({
        ...item,
        percentualRealizado: totalRealizado > 0 ? (item.realizado / totalRealizado) * 100 : 0,
      }))
      .sort((itemA, itemB) => itemB.realizado - itemA.realizado),
    totalRealizado,
  }
}

function somarDespesasComCartaoMensal(categorias, lancamentos, parcelasCartao, ano, mes) {
  const categoriasPorId = new Map(categorias.map((categoria) => [Number(categoria.id), categoria]))
  const totalLancamentos = lancamentos
    .filter(
      (lancamento) =>
        lancamento.tipo_lancamento === 'Despesa' &&
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes &&
        !isCategoriaCartaoCredito(getCategoriaLancamento(categoriasPorId, lancamento).categoria),
    )
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)

  const totalCartao = parcelasCartao
    .filter((parcela) => isParcelaCartaoNoPeriodo(parcela, ano, mes))
    .reduce((total, parcela) => total + Number(parcela.valor_parcela || 0), 0)

  return totalLancamentos + totalCartao
}

function compararPeriodo(lancamento, ano, mes) {
  const anoLancamento = Number(lancamento.ano_vencimento)
  const mesLancamento = Number(lancamento.mes_vencimento)

  if (anoLancamento !== ano) {
    return anoLancamento - ano
  }

  return mesLancamento - mes
}

function compararPorData(a, b) {
  if (Number(a.ano) !== Number(b.ano)) {
    return Number(a.ano) - Number(b.ano)
  }

  if (Number(a.mes) !== Number(b.mes)) {
    return Number(a.mes) - Number(b.mes)
  }

  return Number(a.dia) - Number(b.dia)
}

function formatarDataCurta({ dia, mes }) {
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

function formatarDataCompleta({ dia, mes, ano }) {
  return `${formatarDataCurta({ dia, mes })}/${ano}`
}

function normalizarTexto(texto) {
  if (typeof texto !== 'string' || !/[ÃÂ]/.test(texto)) {
    return texto
  }

  try {
    const bytes = Uint8Array.from(texto, (caractere) => caractere.charCodeAt(0))

    return new TextDecoder('utf-8').decode(bytes)
  } catch {
    return texto
  }
}

function calcularImpactoNaConta(conta, lancamento) {
  const contaId = Number(conta.id)
  const valor = Number(lancamento.valor || 0)

  if (lancamento.tipo_lancamento === 'Receita' && Number(lancamento.conta_id) === contaId) {
    return valor
  }

  if (lancamento.tipo_lancamento === 'Despesa' && Number(lancamento.conta_id) === contaId) {
    return -valor
  }

  if (
    lancamento.tipo_lancamento === 'Transferência' &&
    Number(lancamento.conta_origem_id) === contaId
  ) {
    return -valor
  }

  if (
    lancamento.tipo_lancamento === 'Transferência' &&
    Number(lancamento.conta_destino_id) === contaId
  ) {
    return valor
  }

  return 0
}

function calcularImpactoGlobal(lancamento) {
  const valor = Number(lancamento.valor || 0)

  if (lancamento.tipo_lancamento === 'Receita') {
    return valor
  }

  if (lancamento.tipo_lancamento === 'Despesa') {
    return -valor
  }

  return 0
}

function calcularTotalPorConta(conta, lancamentos, tipo) {
  return lancamentos.reduce((total, lancamento) => {
    if (lancamento.tipo_lancamento !== tipo) {
      return total
    }

    if (tipo === 'Transferência') {
      return Number(lancamento.conta_origem_id) === Number(conta.id)
        ? total + Number(lancamento.valor || 0)
        : total
    }

    return total + calcularImpactoNaConta(conta, lancamento)
  }, 0)
}

function calcularSaldosConta(conta, lancamentos, ano, mes) {
  const saldoInicial = Number(conta.saldoInicial || 0)
  const lancamentosAteOMes = lancamentos.filter(
    (lancamento) =>
      Boolean(lancamento.data_pagamento) && compararPeriodo(lancamento, ano, mes) <= 0,
  )
  const lancamentosPendentesDoMes = lancamentos.filter(
    (lancamento) =>
      !lancamento.data_pagamento &&
      Number(lancamento.mes_vencimento) === mes &&
      Number(lancamento.ano_vencimento) === ano,
  )
  const lancamentosPagosDoMes = lancamentos.filter(
    (lancamento) =>
      Boolean(lancamento.data_pagamento) &&
      Number(lancamento.mes_vencimento) === mes &&
      Number(lancamento.ano_vencimento) === ano,
  )

  const saldoAtual = lancamentosAteOMes.reduce((saldo, lancamento) => {
    return saldo + calcularImpactoNaConta(conta, lancamento)
  }, saldoInicial)

  const saldoPrevisto = lancamentosPendentesDoMes.reduce((saldo, lancamento) => {
    return saldo + calcularImpactoNaConta(conta, lancamento)
  }, saldoAtual)

  return {
    despesasPrevistas: Math.abs(calcularTotalPorConta(conta, lancamentosPendentesDoMes, 'Despesa')),
    despesasRealizadas: Math.abs(calcularTotalPorConta(conta, lancamentosPagosDoMes, 'Despesa')),
    receitasPrevistas: calcularTotalPorConta(conta, lancamentosPendentesDoMes, 'Receita'),
    receitasRealizadas: calcularTotalPorConta(conta, lancamentosPagosDoMes, 'Receita'),
    saldoAtual,
    saldoPrevisto,
    transferenciasPrevistas: calcularTotalPorConta(
      conta,
      lancamentosPendentesDoMes,
      'Transferência',
    ),
    transferenciasRealizadas: calcularTotalPorConta(conta, lancamentosPagosDoMes, 'Transferência'),
  }
}

function montarPendenciasMes(lancamentos, ano, mes, contasInvestimentoIds) {
  return lancamentos
    .filter(
      (lancamento) =>
        !lancamento.data_pagamento &&
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes &&
        !isLancamentoEmContaInvestimento(lancamento, contasInvestimentoIds),
    )
    .reduce(
      (totais, lancamento) => {
        const valor = Number(lancamento.valor || 0)

        if (lancamento.tipo_lancamento === 'Receita') {
          totais.aReceber += valor
        }

        if (lancamento.tipo_lancamento === 'Despesa') {
          totais.aPagar += valor
        }

        if (lancamento.tipo_lancamento === 'Transferência') {
          totais.aTransferir += valor
        }

        return totais
      },
      {
        aPagar: 0,
        aReceber: 0,
        aTransferir: 0,
      },
    )
}

function montarSaldoProjetadoDiario(lancamentos, saldoAtual, ano, mes, contasInvestimentoIds) {
  const movimentosPendentes = lancamentos
    .filter(
      (lancamento) =>
        !lancamento.data_pagamento &&
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes &&
        ['Receita', 'Despesa'].includes(lancamento.tipo_lancamento) &&
        !isLancamentoEmContaInvestimento(lancamento, contasInvestimentoIds),
    )
    .map((lancamento) => ({
      dia: Number(lancamento.dia_vencimento),
      impacto: calcularImpactoGlobal(lancamento),
      mes: Number(lancamento.mes_vencimento),
      ano: Number(lancamento.ano_vencimento),
    }))
    .sort(compararPorData)

  const pontos = []
  let saldo = saldoAtual

  movimentosPendentes.forEach((movimento) => {
    saldo += movimento.impacto

    const ultimo = pontos[pontos.length - 1]

    if (ultimo?.dia === movimento.dia) {
      ultimo.saldo = saldo
      ultimo.impacto += movimento.impacto
      return
    }

    pontos.push({
      ...movimento,
      saldo,
    })
  })

  return pontos
}

function montarVariacaoCategorias(resumoCategorias, mes) {
  if (mes <= 1) {
    return []
  }

  return resumoCategorias
    .map((categoria) => {
      const atual = Number(categoria.meses[mes - 1] || 0)
      const anterior = Number(categoria.meses[mes - 2] || 0)
      const diferenca = atual - anterior

      return {
        categoria: categoria.categoria,
        diferenca,
        percentual: anterior > 0 ? (diferenca / anterior) * 100 : atual > 0 ? 100 : 0,
        atual,
        anterior,
      }
    })
    .filter((item) => item.atual > 0 || item.anterior > 0)
    .sort((a, b) => Math.abs(b.diferenca) - Math.abs(a.diferenca))
}

function getIndicadorVariacaoCategoria(item) {
  if (item.diferenca < 0) {
    return {
      classe: 'category-change-list__indicator--down',
      titulo: 'Reduziu o gasto',
    }
  }

  if (item.diferenca > 0) {
    return {
      classe: 'category-change-list__indicator--up',
      titulo: 'Aumentou o gasto',
    }
  }

  return {
    classe: 'category-change-list__indicator--flat',
    titulo: 'Sem variação',
  }
}

function formatarPercentualVariacao(item) {
  const percentual = Number(item.percentual || 0)
  const sinal = percentual > 0 ? '+' : percentual < 0 ? '-' : ''

  return `${sinal}${Math.abs(percentual).toFixed(1)}%`
}

function formatarOrigemLancamentoCategoria(origem) {
  return normalizarTexto(origem)?.replace(/^Conta\s+/i, '') || ''
}

function montarDespesasFixasVariaveis(categorias, lancamentos, parcelasCartao, ano, mes) {
  const categoriasPorId = new Map(categorias.map((categoria) => [Number(categoria.id), categoria]))
  const totalFixas = lancamentos
    .filter(
      (lancamento) =>
        lancamento.tipo_lancamento === 'Despesa' &&
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes &&
        Boolean(lancamento.recorrencia_id) &&
        !isCategoriaCartaoCredito(getCategoriaLancamento(categoriasPorId, lancamento).categoria),
    )
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)
  const totalCartao = parcelasCartao
    .filter((parcela) => isParcelaCartaoNoPeriodo(parcela, ano, mes))
    .reduce((total, parcela) => total + Number(parcela.valor_parcela || 0), 0)
  const totalDespesasAvulsas = lancamentos
    .filter(
      (lancamento) =>
        lancamento.tipo_lancamento === 'Despesa' &&
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes &&
        !lancamento.recorrencia_id &&
        !isCategoriaCartaoCredito(getCategoriaLancamento(categoriasPorId, lancamento).categoria),
    )
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)

  return {
    fixas: totalFixas,
    variaveis: totalDespesasAvulsas + totalCartao,
  }
}

function montarInvestimentos(lancamentos, ano, mes) {
  const transferenciasInvestimento = lancamentos.filter((lancamento) => {
    const categoria = `${lancamento.categoria || ''}`.toLowerCase()
    const descricao = `${lancamento.descricao || ''}`.toLowerCase()

    return (
      lancamento.tipo_lancamento === 'Transferência' &&
      (categoria.includes('invest') ||
        categoria.includes('poup') ||
        descricao.includes('invest') ||
        descricao.includes('poup'))
    )
  })

  const mesAtual = transferenciasInvestimento
    .filter(
      (lancamento) =>
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes,
    )
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)
  const anoAtual = transferenciasInvestimento
    .filter((lancamento) => Number(lancamento.ano_vencimento) === ano)
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)

  return {
    ano: anoAtual,
    mes: mesAtual,
  }
}

function montarFatiasPizzaCategorias(itens) {
  let acumulado = 0

  return itens.map((item, index) => {
    const inicio = acumulado
    const fim = acumulado + item.percentualRealizado

    acumulado = fim

    return {
      ...item,
      cor: item.cor || coresGraficoCategorias[index % coresGraficoCategorias.length],
      fim,
      inicio,
    }
  })
}

function montarMaioresCategoriasDespesa(itens, limite = 7) {
  const maiores = itens.slice(0, limite)
  const restantes = itens.slice(limite)

  if (restantes.length === 0) {
    return maiores
  }

  const totalOutras = restantes.reduce((total, item) => total + Number(item.realizado || 0), 0)
  const percentualOutras = restantes.reduce(
    (total, item) => total + Number(item.percentualRealizado || 0),
    0,
  )

  return [
    ...maiores,
    {
      categoria: 'Outras',
      cor: '#9aa6b2',
      percentualRealizado: percentualOutras,
      realizado: totalOutras,
    },
  ]
}

function montarCategoriasDisponiveis(categorias, lancamentos, parcelasCartao, ano, mes) {
  const categoriasComMovimento = new Set()

  lancamentos
    .filter(
      (lancamento) =>
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes,
    )
    .forEach((lancamento) => {
      if (lancamento.categoria_id) {
        categoriasComMovimento.add(Number(lancamento.categoria_id))
      }
    })

  parcelasCartao
    .filter((parcela) => isParcelaCartaoNoPeriodo(parcela, ano, mes))
    .forEach((parcela) => {
      if (parcela.categoria_id) {
        categoriasComMovimento.add(Number(parcela.categoria_id))
      }
    })

  return categorias
    .filter(
      (categoria) =>
        categoriasComMovimento.has(Number(categoria.id)) &&
        !isCategoriaCartaoCredito(categoria),
    )
    .sort((categoriaA, categoriaB) =>
      categoriaA.descricao.localeCompare(categoriaB.descricao, 'pt-BR'),
    )
}

function montarLancamentosPorCategoria(lancamentos, parcelasCartao, categoriaId, ano, mes) {
  if (!categoriaId) {
    return []
  }

  const categoriaSelecionadaId = Number(categoriaId)
  const lancamentosConta = lancamentos
    .filter(
      (lancamento) =>
        Number(lancamento.categoria_id) === categoriaSelecionadaId &&
        Number(lancamento.ano_vencimento) === ano &&
        Number(lancamento.mes_vencimento) === mes,
    )
    .map((lancamento) => {
      const detalhe =
        lancamento.tipo_lancamento === 'Transferência'
          ? `${lancamento.conta_origem || 'Origem'} -> ${lancamento.conta_destino || 'Destino'}`
          : lancamento.conta || 'Conta n\u00e3o informada'

      return {
        id: `conta-${lancamento.id}`,
        data: {
          ano: lancamento.ano_vencimento,
          dia: lancamento.dia_vencimento,
          mes: lancamento.mes_vencimento,
        },
        descricao: lancamento.descricao,
        detalhe,
        origem: detalhe,
        status: lancamento.data_pagamento ? 'Realizado' : 'Pendente',
        tipo: lancamento.tipo_lancamento,
        valor: Number(lancamento.valor || 0),
      }
    })

  const lancamentosCartao = parcelasCartao
    .filter(
      (parcela) =>
        Number(parcela.categoria_id) === categoriaSelecionadaId &&
        isParcelaCartaoNoPeriodo(parcela, ano, mes),
    )
    .map((parcela) => ({
      id: `cartao-${parcela.id}`,
      data: {
        ano: getAnoCompetenciaParcelaCartao(parcela),
        dia: getDiaCompetenciaParcelaCartao(parcela),
        mes: getMesCompetenciaParcelaCartao(parcela),
      },
      descricao: formatarDescricaoParcelaCartao(parcela),
      detalhe: `${parcela.cartao || 'Cart\u00e3o'} - parcela ${parcela.numero_parcela}/${parcela.total_parcelas}`,
      origem: parcela.cartao || 'Cart\u00e3o',
      status: isFaturaParcelaCartaoPaga(parcela) ? 'Realizado' : 'Na fatura',
      tipo: 'Despesa',
      valor: Number(parcela.valor_parcela || 0),
    }))

  return [...lancamentosConta, ...lancamentosCartao].sort((itemA, itemB) =>
    compararPorData(itemA.data, itemB.data),
  )
}

function CategoriaSelector({ categorias, value, onChange }) {
  const categoriaSelecionadaIndex = categorias.findIndex(
    (categoria) => Number(categoria.id) === Number(value),
  )
  const categoriaSelecionada = categorias[categoriaSelecionadaIndex]
  const estaDesabilitado = categorias.length === 0

  function atualizarCategoria(proximoIndex) {
    const proximaCategoria = categorias[proximoIndex]

    if (proximaCategoria) {
      onChange(Number(proximaCategoria.id))
    }
  }

  function selecionarCategoriaAnterior() {
    if (estaDesabilitado) {
      return
    }

    atualizarCategoria(categoriaSelecionadaIndex <= 0 ? categorias.length - 1 : categoriaSelecionadaIndex - 1)
  }

  function selecionarProximaCategoria() {
    if (estaDesabilitado) {
      return
    }

    atualizarCategoria(categoriaSelecionadaIndex >= categorias.length - 1 ? 0 : categoriaSelecionadaIndex + 1)
  }

  return (
    <div className="period-select category-filter" aria-label="Selecionar categoria">
      <button
        className="period-select__button"
        type="button"
        onClick={selecionarCategoriaAnterior}
        disabled={estaDesabilitado}
        aria-label="Categoria anterior"
        title="Categoria anterior"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <span className="period-select__value">
        {normalizarTexto(categoriaSelecionada?.descricao) || 'Sem categoria'}
      </span>

      <button
        className="period-select__button"
        type="button"
        onClick={selecionarProximaCategoria}
        disabled={estaDesabilitado}
        aria-label="Pr\u00f3xima categoria"
        title="Pr\u00f3xima categoria"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}

function Home() {
  const { notificarErro } = useNotificacoes()
  const [contas, setContas] = useState([])
  const [categorias, setCategorias] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [parcelasCartao, setParcelasCartao] = useState([])
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false)
  const [modalVariacaoCategoriasAberto, setModalVariacaoCategoriasAberto] = useState(false)
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear())
  const [categoriaSelecionadaIdPreferida, setCategoriaSelecionadaIdPreferida] = useState(null)

  useEffect(() => {
    async function carregarDashboard() {
      try {
        const [
          dadosContas,
          dadosCategorias,
          dadosLancamentos,
          dadosParcelasCartao,
        ] = await Promise.all([
          fetchContas(),
          fetchCategorias(),
          fetchLancamentos(),
          fetchParcelasCartao(),
        ])

        setContas(dadosContas)
        setCategorias(dadosCategorias)
        setLancamentos(dadosLancamentos)
        setParcelasCartao(dadosParcelasCartao)
      } catch (error) {
        notificarErro(error.message)
      }
    }

    carregarDashboard()
  }, [notificarErro])

  const lancamentosDoMes = useMemo(
    () =>
      lancamentos.filter(
        (lancamento) =>
          Number(lancamento.mes_vencimento) === mesSelecionado &&
          Number(lancamento.ano_vencimento) === anoSelecionado,
      ),
    [anoSelecionado, lancamentos, mesSelecionado],
  )
  const contasInvestimentoIds = useMemo(
    () =>
      new Set(
        contas
          .filter((conta) => isContaInvestimento(conta))
          .map((conta) => Number(conta.id)),
      ),
    [contas],
  )
  const lancamentosDoMesOperacionais = useMemo(
    () =>
      lancamentosDoMes.filter(
        (lancamento) => !isLancamentoEmContaInvestimento(lancamento, contasInvestimentoIds),
      ),
    [contasInvestimentoIds, lancamentosDoMes],
  )
  const categoriasDisponiveis = useMemo(
    () =>
      montarCategoriasDisponiveis(
        categorias,
        lancamentos,
        parcelasCartao,
        anoSelecionado,
        mesSelecionado,
      ),
    [anoSelecionado, categorias, lancamentos, mesSelecionado, parcelasCartao],
  )
  const categoriaSelecionadaId = useMemo(() => {
    if (categoriasDisponiveis.length === 0) {
      return null
    }

    const categoriaPreferidaExiste = categoriasDisponiveis.some(
      (categoria) => Number(categoria.id) === Number(categoriaSelecionadaIdPreferida),
    )

    return categoriaPreferidaExiste
      ? Number(categoriaSelecionadaIdPreferida)
      : Number(categoriasDisponiveis[0].id)
  }, [categoriaSelecionadaIdPreferida, categoriasDisponiveis])

  const contasComSaldo = useMemo(
    () =>
      contas.map((conta) => {
        const saldos = calcularSaldosConta(conta, lancamentos, anoSelecionado, mesSelecionado)

        return {
          ...conta,
          despesasPrevistas: saldos.despesasPrevistas,
          despesasRealizadas: saldos.despesasRealizadas,
          receitasPrevistas: saldos.receitasPrevistas,
          receitasRealizadas: saldos.receitasRealizadas,
          saldoAtualCalculado: saldos.saldoAtual,
          saldoPrevisto: saldos.saldoPrevisto,
          transferenciasPrevistas: saldos.transferenciasPrevistas,
          transferenciasRealizadas: saldos.transferenciasRealizadas,
        }
      }),
    [anoSelecionado, contas, lancamentos, mesSelecionado],
  )

  const totalSaldoAtual = useMemo(
    () =>
      contasComSaldo
        .filter((conta) => !isContaInvestimento(conta))
        .reduce((total, conta) => total + conta.saldoAtualCalculado, 0),
    [contasComSaldo],
  )
  const totalSaldoPrevisto = useMemo(
    () =>
      contasComSaldo
        .filter((conta) => !isContaInvestimento(conta))
        .reduce((total, conta) => total + conta.saldoPrevisto, 0),
    [contasComSaldo],
  )
  const totalReceitas = somarLancamentos(lancamentosDoMesOperacionais, 'Receita')
  const totalDespesas = somarDespesasComCartaoMensal(
    categorias,
    lancamentosDoMesOperacionais,
    parcelasCartao,
    anoSelecionado,
    mesSelecionado,
  )
  const resumoDespesasPorCategoria = useMemo(
    () => montarResumoDespesasCategorias(categorias, lancamentos, parcelasCartao, anoSelecionado),
    [anoSelecionado, categorias, lancamentos, parcelasCartao],
  )
  const resumoReceitasPorCategoria = useMemo(
    () => montarResumoCategorias(categorias, lancamentos, anoSelecionado, 'Receita'),
    [anoSelecionado, categorias, lancamentos],
  )
  const totaisDespesasPorCategoria = useMemo(
    () => somarResumoMensal(resumoDespesasPorCategoria),
    [resumoDespesasPorCategoria],
  )
  const totaisReceitasPorCategoria = useMemo(
    () => somarResumoMensal(resumoReceitasPorCategoria),
    [resumoReceitasPorCategoria],
  )
  const rankingDespesasMensal = useMemo(
    () => montarRankingDespesasMensal(
      categorias,
      lancamentos,
      parcelasCartao,
      anoSelecionado,
      mesSelecionado,
    ),
    [anoSelecionado, categorias, lancamentos, mesSelecionado, parcelasCartao],
  )
  const maioresDespesasMensal = useMemo(
    () => montarMaioresCategoriasDespesa(rankingDespesasMensal.itens),
    [rankingDespesasMensal],
  )
  const fatiasDespesasMensal = useMemo(
    () => montarFatiasPizzaCategorias(maioresDespesasMensal),
    [maioresDespesasMensal],
  )
  const graficoPizzaCategorias = fatiasDespesasMensal.length
    ? `conic-gradient(${fatiasDespesasMensal
      .map((item) => `${item.cor} ${item.inicio}% ${item.fim}%`)
      .join(', ')})`
    : undefined
  const pendenciasMes = useMemo(
    () => montarPendenciasMes(
      lancamentos,
      anoSelecionado,
      mesSelecionado,
      contasInvestimentoIds,
    ),
    [anoSelecionado, contasInvestimentoIds, lancamentos, mesSelecionado],
  )
  const variacaoCategorias = useMemo(
    () => montarVariacaoCategorias(resumoDespesasPorCategoria, mesSelecionado),
    [mesSelecionado, resumoDespesasPorCategoria],
  )
  const maioresVariacoesCategorias = useMemo(
    () => variacaoCategorias.slice(0, 6),
    [variacaoCategorias],
  )
  const despesasFixasVariaveis = useMemo(
    () => montarDespesasFixasVariaveis(
      categorias,
      lancamentos.filter(
        (lancamento) => !isLancamentoEmContaInvestimento(lancamento, contasInvestimentoIds),
      ),
      parcelasCartao,
      anoSelecionado,
      mesSelecionado,
    ),
    [anoSelecionado, categorias, contasInvestimentoIds, lancamentos, mesSelecionado, parcelasCartao],
  )
  const investimentos = useMemo(
    () => montarInvestimentos(lancamentos, anoSelecionado, mesSelecionado),
    [anoSelecionado, lancamentos, mesSelecionado],
  )
  const lancamentosCategoriaSelecionada = useMemo(
    () =>
      montarLancamentosPorCategoria(
        lancamentos,
        parcelasCartao,
        categoriaSelecionadaId,
        anoSelecionado,
        mesSelecionado,
      ),
    [
      anoSelecionado,
      categoriaSelecionadaId,
      lancamentos,
      mesSelecionado,
      parcelasCartao,
    ],
  )
  const totalCategoriaSelecionada = useMemo(
    () =>
      lancamentosCategoriaSelecionada.reduce(
        (total, lancamento) => total + Number(lancamento.valor || 0),
        0,
      ),
    [lancamentosCategoriaSelecionada],
  )
  const totalDespesasMes = despesasFixasVariaveis.fixas + despesasFixasVariaveis.variaveis
  const percentualComprometimento =
    totalReceitas > 0 ? (totalDespesasMes / totalReceitas) * 100 : 0
  const percentualInvestido = totalReceitas > 0 ? (investimentos.mes / totalReceitas) * 100 : 0
  const saldoPendenteLiquido = pendenciasMes.aReceber - pendenciasMes.aPagar

  function renderTabelaCategorias(titulo, resumoCategorias, totais) {
    return (
      <div className="category-summary">
        <div className="category-summary__header">
          <h3>{titulo}</h3>
          <span>{anoSelecionado}</span>
        </div>

        <div className="category-summary__table-wrap">
          <table className="category-summary__table">
            <thead>
              <tr>
                <th>Categoria</th>
                {mesesResumo.map((mes) => (
                  <th key={mes}>{mes}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {resumoCategorias.map((categoria) => (
                <tr key={categoria.categoria}>
                  <td>{categoria.categoria}</td>
                  {categoria.meses.map((valor, index) => (
                    <td key={`${categoria.categoria}-${mesesResumo[index]}`}>
                      {valor > 0 ? formatarMoeda(valor) : '-'}
                    </td>
                  ))}
                  <td>{formatarMoeda(categoria.total)}</td>
                </tr>
              ))}

              {resumoCategorias.length === 0 && (
                <tr>
                  <td colSpan={14}>Nenhuma movimentação encontrada.</td>
                </tr>
              )}
            </tbody>
            {resumoCategorias.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total</td>
                  {totais.meses.map((valor, index) => (
                    <td key={`total-${mesesResumo[index]}`}>{valor > 0 ? formatarMoeda(valor) : '-'}</td>
                  ))}
                  <td>{formatarMoeda(totais.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        actions={
          <>
            <MesSelector
              value={mesSelecionado}
              onChange={setMesSelecionado}
              year={anoSelecionado}
              onYearChange={setAnoSelecionado}
            />
            <AnoSelector value={anoSelecionado} onChange={setAnoSelecionado} />
          </>
        }
      />

      <div className="container">
        <section className="dashboard-page">
          <div className="dashboard-summary">
            <article
              className="dashboard-card dashboard-card--blue"
              title="Saldo atual = saldo inicial das contas operacionais + lançamentos pagos/recebidos até o mês selecionado. Contas de investimento ficam fora deste total."
            >
              <span>Saldo atual</span>
              <strong>{formatarMoeda(totalSaldoAtual)}</strong>
            </article>
            <article
              className="dashboard-card dashboard-card--indigo"
              title="Saldo previsto = saldo atual operacional + lançamentos pendentes do mês selecionado. Contas de investimento ficam fora deste total."
            >
              <span>Saldo previsto</span>
              <strong>{formatarMoeda(totalSaldoPrevisto)}</strong>
            </article>
            <article
              className="dashboard-card dashboard-card--green"
              title="Receitas = soma dos lançamentos de receita do mês em contas operacionais. Contas de investimento ficam fora deste total."
            >
              <span>Receitas</span>
              <strong>{formatarMoeda(totalReceitas)}</strong>
            </article>
            <article
              className="dashboard-card dashboard-card--red"
              title="Despesas = despesas do mês em contas operacionais + parcelas do cartão nas categorias originais, sem duplicar a categoria Cartão de crédito."
            >
              <span>Despesas</span>
              <strong>{formatarMoeda(totalDespesas)}</strong>
            </article>
            <article
              className="dashboard-card dashboard-card--yellow"
              title={`Comprometimento = despesas do mês (${formatarMoeda(totalDespesasMes)}) / receitas (${formatarMoeda(totalReceitas)}).`}
            >
              <span>Comprometimento</span>
              <strong>{percentualComprometimento.toFixed(1)}%</strong>
            </article>
            <article
              className="dashboard-card dashboard-card--green"
              title="Investido no mês = transferências do mês identificadas como investimento ou poupança pela categoria ou descrição."
            >
              <span>Investido no mês</span>
              <strong>{formatarMoeda(investimentos.mes)}</strong>
            </article>
          </div>

          <div className="box-grid">
            <div className="dashboard-section-header">
              <div>
                <h2>Contas ativas</h2>
                <span>Saldo inicial mais movimentações para conferência com o banco</span>
              </div>
            </div>

            <div className="account-indicators">
              {contasComSaldo.map((conta) => (
                <article className="account-indicator" key={conta.id}>
                  <div className="account-indicator__identity">
                    <h3>{conta.descricao}</h3>
                    <span>
                      {conta.banco || 'Sem banco'}
                      {isContaInvestimento(conta) ? ' - fora dos totais gerais' : ''}
                    </span>
                  </div>

                  <table className="account-indicator__table">
                    <thead>
                      <tr>
                        <th />
                        <th>Realizado</th>
                        <th>Previsto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: 'Saldo',
                          previsto: conta.saldoPrevisto,
                          realizado: conta.saldoAtualCalculado,
                        },
                        {
                          label: 'Receitas',
                          previsto: conta.receitasPrevistas,
                          realizado: conta.receitasRealizadas,
                        },
                        {
                          label: 'Despesas',
                          previsto: conta.despesasPrevistas,
                          realizado: conta.despesasRealizadas,
                        },
                        {
                          label: 'Transferências',
                          previsto: conta.transferenciasPrevistas,
                          realizado: conta.transferenciasRealizadas,
                        },
                      ].map((indicador) => (
                        <tr key={indicador.label}>
                          <td>{indicador.label}</td>
                          <td>{formatarMoeda(indicador.realizado)}</td>
                          <td>{formatarMoeda(indicador.previsto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </article>
              ))}

              {contasComSaldo.length === 0 && (
                <p className="dashboard-empty">Nenhuma conta cadastrada.</p>
              )}
            </div>
          </div>

          <div className="dashboard-insights">
            <section className="dashboard-panel dashboard-panel--compact">
              <div className="dashboard-section-header">
                <div>
                  <h2>Pendências do mês</h2>
                  <span>Valores ainda não pagos ou recebidos.</span>
                </div>
              </div>

              <div className="metric-list">
                <div title="A receber = receitas do mes selecionado que ainda nao foram recebidas, excluindo contas de investimento.">
                  <span>A receber</span>
                  <strong className="metric-positive">{formatarMoeda(pendenciasMes.aReceber)}</strong>
                </div>
                <div title="A pagar = despesas do mes selecionado que ainda nao foram pagas, excluindo contas de investimento.">
                  <span>A pagar</span>
                  <strong className="metric-negative">{formatarMoeda(pendenciasMes.aPagar)}</strong>
                </div>
                <div title="Liquido pendente = valor a receber menos valor a pagar.">
                  <span>Líquido pendente</span>
                  <strong className={saldoPendenteLiquido >= 0 ? 'metric-positive' : 'metric-negative'}>
                    {formatarMoeda(saldoPendenteLiquido)}
                  </strong>
                </div>
                <div title="Transferencias pendentes = transferencias do mes ainda nao marcadas como pagas, exceto as que envolvem contas de investimento. Elas mudam contas, mas nao mudam o saldo global.">
                  <span>Transferências pendentes</span>
                  <strong>{formatarMoeda(pendenciasMes.aTransferir)}</strong>
                </div>
              </div>
            </section>

            <section className="dashboard-panel dashboard-panel--compact">
              <div className="dashboard-section-header">
                <div>
                  <h2>Fixas e variáveis</h2>
                  <span>Despesas recorrentes contra gastos avulsos.</span>
                </div>
              </div>

              <div className="metric-list">
                <div title="Fixas = despesas recorrentes do mes selecionado em contas operacionais, sem a categoria Cartao de credito.">
                  <span>Fixas</span>
                  <strong>{formatarMoeda(despesasFixasVariaveis.fixas)}</strong>
                </div>
                <div title="Variaveis = despesas avulsas do mes em contas operacionais + parcelas do cartao nas categorias originais.">
                  <span>Variáveis</span>
                  <strong>{formatarMoeda(despesasFixasVariaveis.variaveis)}</strong>
                </div>
                <div title="Guardado no ano = transferencias do ano identificadas como investimento ou poupanca.">
                  <span>Guardado no ano</span>
                  <strong>{formatarMoeda(investimentos.ano)}</strong>
                </div>
                <div title="% da receita guardada = investido no mes dividido pelas receitas do mes.">
                  <span>% da receita guardada</span>
                  <strong>{percentualInvestido.toFixed(1)}%</strong>
                </div>
              </div>
            </section>
          </div>

          <div className="dashboard-insights dashboard-insights--wide">
            <section className="dashboard-panel dashboard-panel--double">
              <div className="dashboard-section-header">
                <div>
                  <h2>Despesas por categoria</h2>
                  <span>{'Maiores categorias lançadas no m\u00eas filtrado.'}</span>
                </div>
                {rankingDespesasMensal.itens.length > 7 && (
                  <button
                    className="dashboard-link-button"
                    type="button"
                    onClick={() => setModalCategoriasAberto(true)}
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div className="expense-ranking">
                <div className="expense-ranking__totals">
                  <span>Lançado: {formatarMoeda(rankingDespesasMensal.totalRealizado)}</span>
                </div>

                <div className="expense-pie-chart expense-pie-chart--panel">
                  {fatiasDespesasMensal.length > 0 && (
                    <div
                      className="expense-pie-chart__graphic"
                      style={{ background: graficoPizzaCategorias }}
                      role="img"
                      aria-label="Distribuicao das despesas por categoria"
                    >
                      <div>
                        <span>Total</span>
                        <strong>{formatarMoeda(rankingDespesasMensal.totalRealizado)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="expense-pie-chart__legend">
                    {fatiasDespesasMensal.map((item) => (
                      <div className="expense-pie-chart__legend-row" key={item.categoria}>
                        <span
                          className="expense-pie-chart__swatch"
                          style={{ backgroundColor: item.cor }}
                          aria-hidden="true"
                        />
                        <span className="expense-pie-chart__label">{item.categoria}</span>
                        <strong>{item.percentualRealizado.toFixed(1)}%</strong>
                        <span className="expense-pie-chart__value">{formatarMoeda(item.realizado)}</span>
                      </div>
                    ))}
                  </div>

                  {rankingDespesasMensal.itens.length === 0 && (
                    <p className="dashboard-empty">{'Nenhuma despesa encontrada no mês.'}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-section-header">
                <div>
                  <h2>Variação por categoria</h2>
                  <span>Maiores mudanças contra o mês anterior.</span>
                </div>
                {variacaoCategorias.length > 6 && (
                  <button
                    className="dashboard-link-button"
                    type="button"
                    onClick={() => setModalVariacaoCategoriasAberto(true)}
                  >
                    Ver todas
                  </button>
                )}
              </div>

              <div className="category-change-list">
                {maioresVariacoesCategorias.map((item) => {
                  const indicador = getIndicadorVariacaoCategoria(item)

                  return (
                    <div
                      className="category-change-list__row"
                      key={item.categoria}
                      title={`Variação = mês atual (${formatarMoeda(item.atual)}) menos mês anterior (${formatarMoeda(item.anterior)}).`}
                    >
                      <span>{item.categoria}</span>
                      <strong className={item.diferenca >= 0 ? 'metric-negative' : 'metric-positive'}>
                        {item.diferenca >= 0 ? '+' : ''}{formatarMoeda(item.diferenca)}
                      </strong>
                      <span
                        className={`category-change-list__indicator ${indicador.classe}`}
                        title={indicador.titulo}
                        aria-label={indicador.titulo}
                      >
                        {formatarPercentualVariacao(item)}
                      </span>
                    </div>
                  )
                })}
                {variacaoCategorias.length === 0 && (
                  <p className="dashboard-empty">Sem mês anterior para comparar.</p>
                )}
              </div>
            </section>
          </div>

          {modalCategoriasAberto && (
            <div
              className="launch-modal"
              role="presentation"
              onMouseDown={() => setModalCategoriasAberto(false)}
            >
              <div
                className="launch-modal__panel dashboard-category-modal"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className="launch-modal__header">
                  <div>
                    <h2>Todas as categorias</h2>
                    <p>{'Despesas lançadas no mês filtrado.'}</p>
                  </div>
                  <button
                    className="launch-modal__close"
                    type="button"
                    onClick={() => setModalCategoriasAberto(false)}
                    aria-label="Fechar"
                    title="Fechar"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12" />
                      <path d="M18 6 6 18" />
                    </svg>
                  </button>
                </header>

                <div className="dashboard-category-modal__list">
                  {rankingDespesasMensal.itens.map((item) => (
                    <div className="expense-pie-chart__legend-row" key={item.categoria}>
                      <span
                        className="expense-pie-chart__swatch"
                        style={{ backgroundColor: item.cor || '#9aa6b2' }}
                        aria-hidden="true"
                      />
                      <span className="expense-pie-chart__label">{item.categoria}</span>
                      <strong>{item.percentualRealizado.toFixed(1)}%</strong>
                      <span className="expense-pie-chart__value">{formatarMoeda(item.realizado)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalVariacaoCategoriasAberto && (
            <div
              className="launch-modal"
              role="presentation"
              onMouseDown={() => setModalVariacaoCategoriasAberto(false)}
            >
              <div
                className="launch-modal__panel dashboard-category-modal"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className="launch-modal__header">
                  <div>
                    <h2>Variação por categoria</h2>
                    <p>Todas as mudanças contra o mês anterior.</p>
                  </div>
                  <button
                    className="launch-modal__close"
                    type="button"
                    onClick={() => setModalVariacaoCategoriasAberto(false)}
                    aria-label="Fechar"
                    title="Fechar"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6l12 12" />
                      <path d="M18 6 6 18" />
                    </svg>
                  </button>
                </header>

                <div className="category-change-list">
                  {variacaoCategorias.map((item) => {
                    const indicador = getIndicadorVariacaoCategoria(item)

                    return (
                      <div
                        className="category-change-list__row"
                        key={item.categoria}
                        title={`Variação = mês atual (${formatarMoeda(item.atual)}) menos mês anterior (${formatarMoeda(item.anterior)}).`}
                      >
                        <span>{item.categoria}</span>
                        <strong className={item.diferenca >= 0 ? 'metric-negative' : 'metric-positive'}>
                          {item.diferenca >= 0 ? '+' : ''}{formatarMoeda(item.diferenca)}
                        </strong>
                        <span
                          className={`category-change-list__indicator ${indicador.classe}`}
                          title={indicador.titulo}
                          aria-label={indicador.titulo}
                        >
                          {formatarPercentualVariacao(item)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="box-grid">
            <div className="dashboard-section-header">
              <div>
                <h2>Categorias no ano</h2>
                <span>Valores somados por mês no ano filtrado.</span>
              </div>
            </div>

            <div className="category-summary-grid">
              {renderTabelaCategorias(
                'Despesas por categoria',
                resumoDespesasPorCategoria,
                totaisDespesasPorCategoria,
              )}
              {renderTabelaCategorias(
                'Receitas por categoria',
                resumoReceitasPorCategoria,
                totaisReceitasPorCategoria,
              )}
            </div>
          </div>

          <div className="box-grid">
            <div className="dashboard-section-header">
              <div>
                <h2>{'Lan\u00e7amentos por categoria'}</h2>
                <span>{'Movimenta\u00e7\u00f5es da conta e compras no cart\u00e3o no m\u00eas filtrado.'}</span>
              </div>

              <CategoriaSelector
                categorias={categoriasDisponiveis}
                value={categoriaSelecionadaId}
                onChange={setCategoriaSelecionadaIdPreferida}
              />
            </div>

            <div className="category-launches">
              <div className="category-launches__summary">
                <span>{`${lancamentosCategoriaSelecionada.length} lan\u00e7amento(s)`}</span>
                <strong>Total: {formatarMoeda(totalCategoriaSelecionada)}</strong>
              </div>

              <div className="category-launches__list">
                {lancamentosCategoriaSelecionada.map((lancamento) => (
                  <article className="category-launches__row" key={lancamento.id}>
                    <div className="category-launches__date">
                      <span>{formatarDataCompleta(lancamento.data)}</span>
                    </div>

                    <strong className="category-launches__account">
                      {formatarOrigemLancamentoCategoria(lancamento.origem)}
                    </strong>

                    <div className="category-launches__description">
                      <strong>{normalizarTexto(lancamento.descricao)}</strong>
                    </div>

                    <span
                      className={`category-launches__status ${
                        lancamento.status === 'Realizado'
                          ? 'category-launches__status--done'
                          : 'category-launches__status--pending'
                      }`}
                    >
                      {normalizarTexto(lancamento.status)}
                    </span>
                    <span className="category-launches__type">
                      {normalizarTexto(lancamento.tipo)}
                    </span>
                    <strong className="category-launches__value">
                      {formatarMoeda(lancamento.valor)}
                    </strong>
                  </article>
                ))}

                {lancamentosCategoriaSelecionada.length === 0 && (
                  <p className="dashboard-empty">
                    {'Nenhum lan\u00e7amento encontrado para esta categoria.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default Home
