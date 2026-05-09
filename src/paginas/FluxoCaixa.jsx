import { useEffect, useMemo, useState } from 'react'
import { AnoSelector, MesSelector, PageHeader } from '../componentes/PageHeader'
import { fetchBancos, fetchContas } from '../utilitarios/fetch/cadastros'
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

function getBancoIdLancamento(lancamento) {
  return Number(lancamento.banco_id || 0)
}

function somarSaldoInicialContas(contas, bancoId) {
  return contas
    .filter((conta) => Number(conta.banco_id) === bancoId)
    .reduce((total, conta) => total + Number(conta.saldoInicial || 0), 0)
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

function calcularSaldoAbertura({ lancamentos, contas, bancoId, ano, mes }) {
  const saldoContas = somarSaldoInicialContas(contas, bancoId)
  const movimentosAnteriores = lancamentos.filter(
    (lancamento) =>
      ['Receita', 'Despesa'].includes(lancamento.tipo_lancamento) &&
      getBancoIdLancamento(lancamento) === bancoId &&
      compararPeriodo(lancamento, ano, mes) < 0,
  )
  const movimentosPagosAnteriores = filtrarPagos(movimentosAnteriores)

  const receitasAnteriores = somarMovimentos(movimentosPagosAnteriores, 'Receita')
  const despesasAnteriores = somarMovimentos(movimentosPagosAnteriores, 'Despesa')

  return saldoContas + receitasAnteriores - despesasAnteriores
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

function BancoSelect({ bancos, value, onChange }) {
  return (
    <select
      className="bank-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Selecionar banco"
    >
      <option value="todos">Todos os bancos</option>
      {bancos.map((banco) => (
        <option key={banco.id} value={banco.id}>
          {banco.nome}
        </option>
      ))}
    </select>
  )
}

function FluxoCaixa() {
  const [lancamentos, setLancamentos] = useState([])
  const [contas, setContas] = useState([])
  const [bancos, setBancos] = useState([])
  const [bancoSelecionado, setBancoSelecionado] = useState('todos')
  const [mesSelecionado, setMesSelecionado] = useState(() => new Date().getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear())
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregarFluxoCaixa() {
      try {
        const [dadosLancamentos, dadosContas, dadosBancos] = await Promise.all([
          fetchLancamentos(),
          fetchContas(),
          fetchBancos(),
        ])

        setLancamentos(dadosLancamentos)
        setContas(dadosContas)
        setBancos(dadosBancos)
      } catch (error) {
        setErro(error.message)
      }
    }

    carregarFluxoCaixa()
  }, [])

  const bancosVisiveis = useMemo(() => {
    if (bancoSelecionado === 'todos') {
      return bancos
    }

    return bancos.filter((banco) => Number(banco.id) === Number(bancoSelecionado))
  }, [bancoSelecionado, bancos])

  const fluxosPorBanco = bancosVisiveis.map((banco) => {
    const bancoId = Number(banco.id)
    const movimentosDoMes = lancamentos
      .filter(
        (lancamento) =>
          ['Receita', 'Despesa'].includes(lancamento.tipo_lancamento) &&
          getBancoIdLancamento(lancamento) === bancoId &&
          Number(lancamento.mes_vencimento) === mesSelecionado &&
          Number(lancamento.ano_vencimento) === anoSelecionado,
      )
      .sort((a, b) => Number(a.dia_vencimento) - Number(b.dia_vencimento))

    const saldoAbertura = calcularSaldoAbertura({
      ano: anoSelecionado,
      bancoId,
      contas,
      lancamentos,
      mes: mesSelecionado,
    })
    const movimentosPagosDoMes = filtrarPagos(movimentosDoMes)
    const movimentosPendentesDoMes = filtrarPendentes(movimentosDoMes)
    const totalReceitasPagas = somarMovimentos(movimentosPagosDoMes, 'Receita')
    const totalDespesasPagas = somarMovimentos(movimentosPagosDoMes, 'Despesa')
    const totalReceitasPrevistas = somarMovimentos(movimentosPendentesDoMes, 'Receita')
    const totalDespesasPrevistas = somarMovimentos(movimentosPendentesDoMes, 'Despesa')
    const saldoRealizado = saldoAbertura + totalReceitasPagas - totalDespesasPagas
    const saldoPrevisto = Math.max(
      saldoRealizado,
      saldoRealizado + totalReceitasPrevistas - totalDespesasPrevistas,
    )

    return {
      banco,
      movimentos: movimentosDoMes,
      saldoAbertura,
      saldoPrevisto,
      saldoRealizado,
      totalDespesasPagas,
      totalDespesasPrevistas,
      totalReceitasPagas,
      totalReceitasPrevistas,
    }
  })

  const resumoGeral = fluxosPorBanco.reduce(
    (resumo, fluxo) => ({
      saldoAbertura: resumo.saldoAbertura + fluxo.saldoAbertura,
      saldoPrevisto: resumo.saldoPrevisto + fluxo.saldoPrevisto,
      saldoRealizado: resumo.saldoRealizado + fluxo.saldoRealizado,
      totalDespesasPagas: resumo.totalDespesasPagas + fluxo.totalDespesasPagas,
      totalReceitasPagas: resumo.totalReceitasPagas + fluxo.totalReceitasPagas,
    }),
    {
      saldoAbertura: 0,
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
            <MesSelector value={mesSelecionado} onChange={setMesSelecionado} />
            <AnoSelector value={anoSelecionado} onChange={setAnoSelecionado} />
            <BancoSelect
              bancos={bancos}
              value={bancoSelecionado}
              onChange={setBancoSelecionado}
            />
          </>
        }
      />

      <div className="container">
        <section className="cash-flow-page">
          <div className="cash-flow-summary">
            <article className="cash-flow-card cash-flow-card--blue">
              <span>Saldo na virada</span>
              <strong>{formatarMoeda(resumoGeral.saldoAbertura)}</strong>
            </article>
            <article className="cash-flow-card cash-flow-card--green">
              <span>Receitas pagas</span>
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

          {fluxosPorBanco.map((fluxo) => (
            <div className="box-grid" key={fluxo.banco.id}>
              <div className="cash-flow-bank-header">
                <div>
                  <h2>{fluxo.banco.nome}</h2>
                  <span>Saldo na virada: {formatarMoeda(fluxo.saldoAbertura)}</span>
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
                    <td colSpan="6">Receitas pagas</td>
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
