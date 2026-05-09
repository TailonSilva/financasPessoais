import { useEffect, useState } from 'react'
import { AnoSelector, MesSelector, PageHeader } from '../componentes/PageHeader'
import { fetchContas } from '../utilitarios/fetch/cadastros'
import { fetchLancamentos } from '../utilitarios/fetch/lancamentos'
import { formatarMoeda } from '../utilitarios/formatarMoeda'

function compararPeriodo(lancamento, ano, mes) {
  const anoLancamento = Number(lancamento.ano_vencimento)
  const mesLancamento = Number(lancamento.mes_vencimento)

  if (anoLancamento !== ano) {
    return anoLancamento - ano
  }

  return mesLancamento - mes
}

function compararMesAno(anoA, mesA, anoB, mesB) {
  if (Number(anoA) !== Number(anoB)) {
    return Number(anoA) - Number(anoB)
  }

  return Number(mesA) - Number(mesB)
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

function calcularSaldoAtualConta(conta, lancamentos, ano, mes) {
  const saldoInicial = Number(conta.saldoInicial || 0)
  const movimentosPagosAteOMes = lancamentos.filter(
    (lancamento) =>
      Boolean(lancamento.data_pagamento) && compararPeriodo(lancamento, ano, mes) <= 0,
  )

  return movimentosPagosAteOMes.reduce(
    (saldo, lancamento) => saldo + calcularImpactoNaConta(conta, lancamento),
    saldoInicial,
  )
}

function somarMovimentos(movimentos, tipo) {
  return movimentos
    .filter((movimento) => movimento.tipo_lancamento === tipo)
    .reduce((total, movimento) => total + Number(movimento.valor || 0), 0)
}

function filtrarPagos(movimentos) {
  return movimentos.filter((movimento) => Boolean(movimento.data_pagamento))
}

function filtrarPendentes(movimentos) {
  return movimentos.filter((movimento) => !movimento.data_pagamento)
}

function calcularSaldoAberturaConta({ lancamentos, conta, ano, mes, usarPrevisto }) {
  const saldoInicial = Number(conta.saldoInicial || 0)
  const movimentosAnteriores = lancamentos.filter(
    (lancamento) =>
      ['Receita', 'Despesa', 'Transferência'].includes(lancamento.tipo_lancamento) &&
      calcularImpactoNaConta(conta, lancamento) !== 0 &&
      compararPeriodo(lancamento, ano, mes) < 0,
  )
  const movimentosBase = usarPrevisto ? movimentosAnteriores : filtrarPagos(movimentosAnteriores)

  return movimentosBase.reduce(
    (saldo, lancamento) => saldo + calcularImpactoNaConta(conta, lancamento),
    saldoInicial,
  )
}

function formatarVencimento(lancamento) {
  const dia = String(lancamento.dia_vencimento).padStart(2, '0')
  const mes = String(lancamento.mes_vencimento).padStart(2, '0')

  return `${dia}/${mes}/${lancamento.ano_vencimento}`
}

function PagoStatus({ dataPagamento }) {
  if (!dataPagamento) {
    return (
      <span className="status-paid status-paid--no" title="Não pago">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      </span>
    )
  }

  return (
    <span className="status-paid status-paid--yes" title={`Pago em ${dataPagamento}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m5 12 4 4 10-10" />
      </svg>
    </span>
  )
}

function ContaSelect({ contas, value, onChange }) {
  return (
    <select
      className="bank-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Selecionar conta"
    >
      <option value="todas">Todas as contas</option>
      {contas.map((conta) => (
        <option key={conta.id} value={conta.id}>
          {conta.descricao}
        </option>
      ))}
    </select>
  )
}

function FluxoCaixa() {
  const [lancamentos, setLancamentos] = useState([])
  const [contas, setContas] = useState([])
  const [contaSelecionada, setContaSelecionada] = useState('todas')
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear())
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarFluxoCaixa() {
      try {
        const [dadosLancamentos, dadosContas] = await Promise.all([
          fetchLancamentos(),
          fetchContas(),
        ])

        setLancamentos(dadosLancamentos)
        setContas(dadosContas)
      } catch (error) {
        setErro(error.message)
      }
    }

    carregarFluxoCaixa()
  }, [])

  const contasVisiveis = contas.filter(
    (conta) =>
      contaSelecionada === 'todas' || Number(conta.id) === Number(contaSelecionada),
  )
  const hoje = new Date()
  const mesAtual = hoje.getMonth() + 1
  const anoAtual = hoje.getFullYear()
  const periodoFuturo = compararMesAno(
    anoSelecionado,
    mesSelecionado,
    anoAtual,
    mesAtual,
  ) > 0
  const labelSaldoAbertura = periodoFuturo ? 'Saldo inicial previsto' : 'Saldo inicial'

  const fluxosPorConta = contasVisiveis.map((conta) => {
    const movimentosDoMes = lancamentos
      .filter(
        (lancamento) =>
          ['Receita', 'Despesa', 'Transferência'].includes(lancamento.tipo_lancamento) &&
          calcularImpactoNaConta(conta, lancamento) !== 0 &&
          Number(lancamento.mes_vencimento) === mesSelecionado &&
          Number(lancamento.ano_vencimento) === anoSelecionado,
      )
      .sort((a, b) => Number(a.dia_vencimento) - Number(b.dia_vencimento))

    const saldoAbertura = calcularSaldoAberturaConta({
      ano: anoSelecionado,
      conta,
      lancamentos,
      mes: mesSelecionado,
      usarPrevisto: periodoFuturo,
    })
    const movimentosPagosDoMes = filtrarPagos(movimentosDoMes)
    const movimentosPendentesDoMes = filtrarPendentes(movimentosDoMes)
    const totalReceitasPagas = somarMovimentos(movimentosPagosDoMes, 'Receita')
    const totalDespesasPagas = somarMovimentos(movimentosPagosDoMes, 'Despesa')
    const totalReceitasPrevistas = somarMovimentos(movimentosPendentesDoMes, 'Receita')
    const totalDespesasPrevistas = somarMovimentos(movimentosPendentesDoMes, 'Despesa')
    const saldoRealizado = movimentosPagosDoMes.reduce(
      (saldo, lancamento) => saldo + calcularImpactoNaConta(conta, lancamento),
      saldoAbertura,
    )
    const saldoPrevisto = movimentosPendentesDoMes.reduce(
      (saldo, lancamento) => saldo + calcularImpactoNaConta(conta, lancamento),
      saldoRealizado,
    )
    const saldoAtual = calcularSaldoAtualConta(conta, lancamentos, anoSelecionado, mesSelecionado)

    return {
      conta,
      movimentos: movimentosDoMes,
      saldoAbertura,
      saldoAtual,
      saldoPrevisto,
      saldoRealizado,
      totalDespesasPagas,
      totalDespesasPrevistas,
      totalReceitasPagas,
      totalReceitasPrevistas,
    }
  })

  const resumoGeral = fluxosPorConta.reduce(
    (resumo, fluxo) => ({
      saldoAbertura: resumo.saldoAbertura + fluxo.saldoAbertura,
      saldoAtual: resumo.saldoAtual + fluxo.saldoAtual,
      saldoPrevisto: resumo.saldoPrevisto + fluxo.saldoPrevisto,
      saldoRealizado: resumo.saldoRealizado + fluxo.saldoRealizado,
      totalDespesasPagas: resumo.totalDespesasPagas + fluxo.totalDespesasPagas,
      totalReceitasPagas: resumo.totalReceitasPagas + fluxo.totalReceitasPagas,
    }),
    {
      saldoAbertura: 0,
      saldoAtual: 0,
      saldoPrevisto: 0,
      saldoRealizado: 0,
      totalDespesasPagas: 0,
      totalReceitasPagas: 0,
    },
  )

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
            <ContaSelect
              contas={contas}
              value={contaSelecionada}
              onChange={setContaSelecionada}
            />
          </>
        }
      />

      <div className="container">
        <section className="cash-flow-page">
          <div className="cash-flow-summary">
            <article className="cash-flow-card cash-flow-card--blue">
              <span>{labelSaldoAbertura}</span>
              <strong>{formatarMoeda(resumoGeral.saldoAbertura)}</strong>
            </article>
            <article className="cash-flow-card cash-flow-card--yellow">
              <span>Saldo atual geral</span>
              <strong>{formatarMoeda(resumoGeral.saldoAtual)}</strong>
            </article>
            <article className="cash-flow-card cash-flow-card--green">
              <span>Receitas recebidas</span>
              <strong>{formatarMoeda(resumoGeral.totalReceitasPagas)}</strong>
            </article>
            <article className="cash-flow-card cash-flow-card--red">
              <span>Despesas pagas</span>
              <strong>{formatarMoeda(resumoGeral.totalDespesasPagas)}</strong>
            </article>
            <article className="cash-flow-card cash-flow-card--indigo">
              <span>Saldo previsto</span>
              <strong>{formatarMoeda(resumoGeral.saldoPrevisto)}</strong>
            </article>
          </div>

          {erro && <p>{erro}</p>}

          {fluxosPorConta.map((fluxo) => (
            <div className="box-grid" key={fluxo.conta.id}>
              <div className="cash-flow-bank-header">
                <div>
                  <h2>{fluxo.conta.descricao}</h2>
                  <span>{fluxo.conta.banco || 'Sem banco'}</span>
                </div>
                <div className="cash-flow-bank-balances">
                  <span className="cash-flow-bank-balance">
                    <small>Realizado</small>
                    <strong>{formatarMoeda(fluxo.saldoRealizado)}</strong>
                  </span>
                  <span className="cash-flow-bank-balance cash-flow-bank-balance--planned">
                    <small>Previsto</small>
                    <strong>{formatarMoeda(fluxo.saldoPrevisto)}</strong>
                  </span>
                </div>
              </div>

              <table className="grid">
                <thead>
                  <tr>
                    <th>Vencimento</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Conta</th>
                    <th>Tipo</th>
                    <th>Pago</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxo.movimentos.map((movimento) => (
                    <tr
                      className={
                        movimento.tipo_lancamento === 'Receita'
                          ? 'cash-flow-row--income'
                          : 'cash-flow-row--expense'
                      }
                      key={movimento.id}
                    >
                      <td>{formatarVencimento(movimento)}</td>
                      <td>{movimento.descricao}</td>
                      <td>{movimento.categoria}</td>
                      <td>{movimento.conta}</td>
                      <td>{movimento.tipo_lancamento}</td>
                      <td>
                        <PagoStatus dataPagamento={movimento.data_pagamento} />
                      </td>
                      <td>{formatarMoeda(Number(movimento.valor || 0))}</td>
                    </tr>
                  ))}
                  {fluxo.movimentos.length === 0 && (
                    <tr>
                      <td colSpan="7">Nenhum lançamento para este banco no período.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6">{labelSaldoAbertura}</td>
                    <td>{formatarMoeda(fluxo.saldoAbertura)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6">Receitas recebidas</td>
                    <td>{formatarMoeda(fluxo.totalReceitasPagas)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6">Despesas pagas</td>
                    <td>{formatarMoeda(fluxo.totalDespesasPagas)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6">Receitas previstas</td>
                    <td>{formatarMoeda(fluxo.totalReceitasPrevistas)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6">Despesas previstas</td>
                    <td>{formatarMoeda(fluxo.totalDespesasPrevistas)}</td>
                  </tr>
                  <tr>
                    <td colSpan="6">Saldo atual</td>
                    <td>{formatarMoeda(fluxo.saldoAtual)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </section>
      </div>
    </>
  )
}

export default FluxoCaixa
