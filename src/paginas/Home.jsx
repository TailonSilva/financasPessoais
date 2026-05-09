import { useEffect, useMemo, useState } from 'react'
import { AnoSelector, MesSelector, PageHeader } from '../componentes/PageHeader'
import { fetchContas } from '../utilitarios/fetch/cadastros'
import { fetchLancamentos } from '../utilitarios/fetch/lancamentos'
import { formatarMoeda } from '../utilitarios/formatarMoeda'

function somarLancamentos(lancamentos, tipo) {
  return lancamentos
    .filter((lancamento) => lancamento.tipo_lancamento === tipo)
    .reduce((total, lancamento) => total + Number(lancamento.valor || 0), 0)
}

function compararPeriodo(lancamento, ano, mes) {
  const anoLancamento = Number(lancamento.ano_vencimento)
  const mesLancamento = Number(lancamento.mes_vencimento)

  if (anoLancamento !== ano) {
    return anoLancamento - ano
  }

  return mesLancamento - mes
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
  const lancamentosDoMes = lancamentos.filter(
    (lancamento) =>
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
    despesasPrevistas: Math.abs(calcularTotalPorConta(conta, lancamentosDoMes, 'Despesa')),
    despesasRealizadas: Math.abs(calcularTotalPorConta(conta, lancamentosPagosDoMes, 'Despesa')),
    receitasPrevistas: calcularTotalPorConta(conta, lancamentosDoMes, 'Receita'),
    receitasRealizadas: calcularTotalPorConta(conta, lancamentosPagosDoMes, 'Receita'),
    saldoAtual,
    saldoPrevisto,
    transferenciasPrevistas: calcularTotalPorConta(
      conta,
      lancamentosDoMes,
      'Transferência',
    ),
    transferenciasRealizadas: calcularTotalPorConta(conta, lancamentosPagosDoMes, 'Transferência'),
  }
}

function Home() {
  const [contas, setContas] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear())
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarDashboard() {
      try {
        const [dadosContas, dadosLancamentos] = await Promise.all([
          fetchContas(),
          fetchLancamentos(),
        ])

        setContas(dadosContas)
        setLancamentos(dadosLancamentos)
      } catch (error) {
        setErro(error.message)
      }
    }

    carregarDashboard()
  }, [])

  const lancamentosDoMes = useMemo(
    () =>
      lancamentos.filter(
        (lancamento) =>
          Number(lancamento.mes_vencimento) === mesSelecionado &&
          Number(lancamento.ano_vencimento) === anoSelecionado,
      ),
    [anoSelecionado, lancamentos, mesSelecionado],
  )

  const contasComSaldo = contas.map((conta) => {
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
  })

  const totalSaldoAtual = contasComSaldo.reduce(
    (total, conta) => total + conta.saldoAtualCalculado,
    0,
  )
  const totalSaldoPrevisto = contasComSaldo.reduce(
    (total, conta) => total + conta.saldoPrevisto,
    0,
  )
  const totalReceitas = somarLancamentos(lancamentosDoMes, 'Receita')
  const totalDespesas = somarLancamentos(lancamentosDoMes, 'Despesa')

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
          {erro && <p>{erro}</p>}

          <div className="dashboard-summary">
            <article className="dashboard-card dashboard-card--blue">
              <span>Saldo atual</span>
              <strong>{formatarMoeda(totalSaldoAtual)}</strong>
            </article>
            <article className="dashboard-card dashboard-card--indigo">
              <span>Saldo previsto</span>
              <strong>{formatarMoeda(totalSaldoPrevisto)}</strong>
            </article>
            <article className="dashboard-card dashboard-card--green">
              <span>Receitas</span>
              <strong>{formatarMoeda(totalReceitas)}</strong>
            </article>
            <article className="dashboard-card dashboard-card--red">
              <span>Despesas</span>
              <strong>{formatarMoeda(totalDespesas)}</strong>
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
                    <span>{conta.banco || 'Sem banco'}</span>
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
        </section>
      </div>
    </>
  )
}

export default Home
