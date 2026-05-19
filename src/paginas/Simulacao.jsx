import { useEffect, useMemo, useState } from 'react'
import { AnoSelector, PageHeader } from '../componentes/PageHeader'
import { fetchCategorias, fetchContas } from '../utilitarios/fetch/cadastros'
import { fetchParcelasCartao } from '../utilitarios/fetch/faturasCartao'
import { fetchLancamentos } from '../utilitarios/fetch/lancamentos'
import { formatarMoeda } from '../utilitarios/formatarMoeda'
import { useNotificacoes } from '../componentes/notificacoesContext'

const tiposSimulacao = {
  despesas: {
    label: 'Despesas',
    totalLabel: 'Total de despesas',
  },
  receitas: {
    label: 'Receitas',
    totalLabel: 'Total de receitas',
  },
  investimentos: {
    label: 'Investimentos',
    totalLabel: 'Total de investimentos',
  },
}

function isContaInvestimento(conta) {
  const tipoConta = `${conta?.tipo_conta || ''}`.toLowerCase()

  return tipoConta.includes('invest')
}

function criarResumoVazio(categoria) {
  return {
    categoria,
    categoriaId: Number(categoria.id),
    meses: Array.from({ length: 12 }, () => 0),
    total: 0,
  }
}

function adicionarValorResumo(resumoPorCategoria, categoriasPorId, categoriaId, mes, valor) {
  const id = Number(categoriaId || 0)
  const mesReferencia = Number(mes)

  if (!id || mesReferencia < 1 || mesReferencia > 12) {
    return
  }

  const categoria = categoriasPorId.get(id)

  if (!categoria) {
    return
  }

  if (!resumoPorCategoria.has(id)) {
    resumoPorCategoria.set(id, criarResumoVazio(categoria))
  }

  const resumo = resumoPorCategoria.get(id)
  const valorNumerico = Number(valor || 0)
  resumo.meses[mesReferencia - 1] += valorNumerico
  resumo.total += valorNumerico
}

function calcularMediaMensal(resumo) {
  const mesesComValor = resumo.meses.filter((valor) => Number(valor || 0) > 0).length

  return mesesComValor > 0 ? resumo.total / mesesComValor : 0
}

function montarMediasPorCategoria({
  ano,
  categorias,
  contasInvestimentoIds,
  lancamentos,
  parcelasCartao,
  tipo,
}) {
  const categoriasPorId = new Map(categorias.map((categoria) => [Number(categoria.id), categoria]))
  const resumoPorCategoria = new Map()

  lancamentos
    .filter((lancamento) => Number(lancamento.ano_vencimento) === ano)
    .forEach((lancamento) => {
      if (tipo === 'despesas' && lancamento.tipo_lancamento === 'Despesa') {
        adicionarValorResumo(
          resumoPorCategoria,
          categoriasPorId,
          lancamento.categoria_id,
          lancamento.mes_vencimento,
          lancamento.valor,
        )
      }

      if (tipo === 'receitas' && lancamento.tipo_lancamento === 'Receita') {
        adicionarValorResumo(
          resumoPorCategoria,
          categoriasPorId,
          lancamento.categoria_id,
          lancamento.mes_vencimento,
          lancamento.valor,
        )
      }

      if (
        tipo === 'investimentos' &&
        lancamento.tipo_lancamento === 'Transferência' &&
        contasInvestimentoIds.has(Number(lancamento.conta_destino_id))
      ) {
        adicionarValorResumo(
          resumoPorCategoria,
          categoriasPorId,
          lancamento.categoria_id,
          lancamento.mes_vencimento,
          lancamento.valor,
        )
      }
    })

  if (tipo === 'despesas') {
    parcelasCartao
      .filter((parcela) => Number(parcela.ano_vencimento ?? parcela.ano_referencia) === ano)
      .forEach((parcela) => {
        adicionarValorResumo(
          resumoPorCategoria,
          categoriasPorId,
          parcela.categoria_id,
          parcela.mes_vencimento ?? parcela.mes_referencia,
          parcela.valor_parcela,
        )
      })
  }

  return Array.from(resumoPorCategoria.values())
    .map((resumo) => ({
      ...resumo,
      media: calcularMediaMensal(resumo),
    }))
    .sort((itemA, itemB) => itemA.categoria.descricao.localeCompare(itemB.categoria.descricao))
}

function formatarValorInput(valor) {
  return Number(valor || 0).toFixed(2)
}

function parseValorInput(valor) {
  const normalizado = `${valor}`.replace(',', '.')
  const numero = Number(normalizado)

  return Number.isFinite(numero) ? numero : 0
}

function criarLinhaSimulacao(tipo, categoriaId, sufixo = 'media') {
  return {
    id: `${tipo}-${categoriaId}-${sufixo}`,
    categoriaId: Number(categoriaId),
  }
}

function SimulacaoSecao({
  categorias,
  children,
  medias,
  onAddCategoria,
  onChangeValor,
  onRemoveCategoria,
  rows,
  tipo,
  valoresEditados,
}) {
  const linhasSelecionadas = rows
    .map((linha) => {
      const categoria = categorias.find((item) => Number(item.id) === Number(linha.categoriaId))

      if (!categoria) {
        return null
      }

      const media = medias.find((item) => Number(item.categoriaId) === Number(linha.categoriaId))
      const valor =
        valoresEditados[linha.id] ?? (media ? formatarValorInput(media.media) : '0.00')

      return {
        categoria,
        id: linha.id,
        media: media?.media || 0,
        valor,
      }
    })
    .filter(Boolean)
  const total = linhasSelecionadas.reduce(
    (soma, item) => soma + parseValorInput(item.valor),
    0,
  )

  return (
    <div className="box-grid simulation-section">
      {children}

      <div className="simulation-section__header">
        <h2>{tiposSimulacao[tipo].label}</h2>
        <select
          value=""
          onChange={(event) => onAddCategoria(tipo, event.target.value)}
          aria-label={`Adicionar categoria em ${tiposSimulacao[tipo].label}`}
        >
          <option value="">Adicionar categoria</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.descricao}
            </option>
          ))}
        </select>
      </div>

      <table className="grid simulation-grid">
        <colgroup>
          <col className="simulation-grid__col-category" />
          <col className="simulation-grid__col-average" />
          <col className="simulation-grid__col-value" />
          <col className="simulation-grid__col-action" />
        </colgroup>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Media do ano</th>
            <th>Valor simulado</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {linhasSelecionadas.map((item) => (
            <tr key={item.id}>
              <td className="simulation-grid__category">
                <span className="launches-grid__inline">
                  {item.categoria.icone && (
                    <span className="launches-grid__category-icon">{item.categoria.icone}</span>
                  )}
                  {item.categoria.descricao}
                </span>
              </td>
              <td className="simulation-grid__money">{formatarMoeda(item.media)}</td>
              <td>
                <input
                  className="simulation-grid__input"
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.valor}
                  onChange={(event) =>
                    onChangeValor(tipo, item.id, event.target.value)
                  }
                />
              </td>
              <td>
                <button
                  className="simulation-grid__remove"
                  type="button"
                  onClick={() => onRemoveCategoria(tipo, item.id)}
                  aria-label={`Remover ${item.categoria.descricao}`}
                  title="Remover categoria"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}

          {linhasSelecionadas.length === 0 && (
            <tr>
              <td colSpan="4" className="simulation-grid__empty">
                Nenhuma categoria selecionada.
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td className="launches-grid__total-label" colSpan="2">
              {tiposSimulacao[tipo].totalLabel}
            </td>
            <td className="simulation-grid__money">{formatarMoeda(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function Simulacao() {
  const { notificarErro } = useNotificacoes()
  const [anoSelecionado, setAnoSelecionado] = useState(() => new Date().getFullYear())
  const [categorias, setCategorias] = useState([])
  const [contas, setContas] = useState([])
  const [lancamentos, setLancamentos] = useState([])
  const [parcelasCartao, setParcelasCartao] = useState([])
  const [selecoesEditadas, setSelecoesEditadas] = useState({
    ano: null,
    selecoes: null,
  })
  const [valoresEditados, setValoresEditados] = useState({
    ano: null,
    valores: null,
  })

  useEffect(() => {
    async function carregarSimulacao() {
      try {
        const [dadosCategorias, dadosContas, dadosLancamentos, dadosParcelasCartao] =
          await Promise.all([
            fetchCategorias({ incluirInativos: true }),
            fetchContas(),
            fetchLancamentos(),
            fetchParcelasCartao(),
          ])

        setCategorias(dadosCategorias)
        setContas(dadosContas)
        setLancamentos(dadosLancamentos)
        setParcelasCartao(dadosParcelasCartao)
      } catch (error) {
        notificarErro(error.message)
      }
    }

    carregarSimulacao()
  }, [notificarErro])

  const contasInvestimentoIds = useMemo(
    () =>
      new Set(
        contas
          .filter((conta) => isContaInvestimento(conta))
          .map((conta) => Number(conta.id)),
      ),
    [contas],
  )
  const medias = useMemo(
    () => ({
      despesas: montarMediasPorCategoria({
        ano: anoSelecionado,
        categorias,
        contasInvestimentoIds,
        lancamentos,
        parcelasCartao,
        tipo: 'despesas',
      }),
      receitas: montarMediasPorCategoria({
        ano: anoSelecionado,
        categorias,
        contasInvestimentoIds,
        lancamentos,
        parcelasCartao,
        tipo: 'receitas',
      }),
      investimentos: montarMediasPorCategoria({
        ano: anoSelecionado,
        categorias,
        contasInvestimentoIds,
        lancamentos,
        parcelasCartao,
        tipo: 'investimentos',
      }),
    }),
    [anoSelecionado, categorias, contasInvestimentoIds, lancamentos, parcelasCartao],
  )
  const selecoesPadrao = useMemo(
    () => ({
      despesas: medias.despesas.map((item) =>
        criarLinhaSimulacao('despesas', item.categoriaId),
      ),
      receitas: medias.receitas.map((item) =>
        criarLinhaSimulacao('receitas', item.categoriaId),
      ),
      investimentos: medias.investimentos.map((item) =>
        criarLinhaSimulacao('investimentos', item.categoriaId),
      ),
    }),
    [medias],
  )
  const categoriasSelecionadas =
    selecoesEditadas.ano === anoSelecionado && selecoesEditadas.selecoes
      ? selecoesEditadas.selecoes
      : selecoesPadrao
  const valoresAtuais =
    valoresEditados.ano === anoSelecionado && valoresEditados.valores
      ? valoresEditados.valores
      : {
        despesas: {},
        receitas: {},
        investimentos: {},
      }

  function adicionarCategoria(tipo, categoriaId) {
    const id = Number(categoriaId)

    if (!id) {
      return
    }

    setSelecoesEditadas({
      ano: anoSelecionado,
      selecoes: {
        ...categoriasSelecionadas,
        [tipo]: [
          ...categoriasSelecionadas[tipo],
          criarLinhaSimulacao(tipo, id, `${Date.now()}-${categoriasSelecionadas[tipo].length}`),
        ],
      },
    })
  }

  function removerCategoria(tipo, rowId) {
    setSelecoesEditadas({
      ano: anoSelecionado,
      selecoes: {
        ...categoriasSelecionadas,
        [tipo]: categoriasSelecionadas[tipo].filter((item) => item.id !== rowId),
      },
    })
    setValoresEditados((valores) => {
      const valoresBase =
        valores.ano === anoSelecionado && valores.valores
          ? valores.valores
          : {
            despesas: {},
            receitas: {},
            investimentos: {},
          }
      const novosValoresTipo = { ...valoresBase[tipo] }
      delete novosValoresTipo[rowId]

      return {
        ano: anoSelecionado,
        valores: {
          ...valoresBase,
          [tipo]: novosValoresTipo,
        },
      }
    })
  }

  function alterarValor(tipo, rowId, valor) {
    setValoresEditados((valores) => ({
      ano: anoSelecionado,
      valores: {
        ...(valores.ano === anoSelecionado && valores.valores
          ? valores.valores
          : {
            despesas: {},
            receitas: {},
            investimentos: {},
          }),
        [tipo]: {
          ...(valores.ano === anoSelecionado && valores.valores ? valores.valores[tipo] : {}),
          [rowId]: valor,
        },
      },
    }))
  }

  function calcularTotal(tipo) {
    return categoriasSelecionadas[tipo].reduce((total, linha) => {
      const media = medias[tipo].find(
        (item) => Number(item.categoriaId) === Number(linha.categoriaId),
      )
      const valor = valoresAtuais[tipo][linha.id] ?? formatarValorInput(media?.media || 0)

      return total + parseValorInput(valor)
    }, 0)
  }

  const totalReceitas = calcularTotal('receitas')
  const totalDespesas = calcularTotal('despesas')
  const totalInvestimentos = calcularTotal('investimentos')
  const saldoSimulado = totalReceitas - totalDespesas - totalInvestimentos

  return (
    <>
      <PageHeader actions={<AnoSelector value={anoSelecionado} onChange={setAnoSelecionado} />} />

      <div className="container">
        <SimulacaoSecao
          categorias={categorias}
          medias={medias.despesas}
          onAddCategoria={adicionarCategoria}
          onChangeValor={alterarValor}
          onRemoveCategoria={removerCategoria}
          rows={categoriasSelecionadas.despesas}
          tipo="despesas"
          valoresEditados={valoresAtuais.despesas}
        >
          <h1>Simulacao</h1>

          <div className="simulation-result">
            <div className="simulation-result__item simulation-result__item--income">
              <span>Total de receitas</span>
              <strong>{formatarMoeda(totalReceitas)}</strong>
            </div>
            <div className="simulation-result__operator">-</div>
            <div className="simulation-result__item simulation-result__item--expense">
              <span>Total de despesas</span>
              <strong>{formatarMoeda(totalDespesas)}</strong>
            </div>
            <div className="simulation-result__operator">-</div>
            <div className="simulation-result__item simulation-result__item--investment">
              <span>Total de investimentos</span>
              <strong>{formatarMoeda(totalInvestimentos)}</strong>
            </div>
            <div className="simulation-result__operator">=</div>
            <div
              className={`simulation-result__item ${
                saldoSimulado >= 0
                  ? 'simulation-result__item--positive'
                  : 'simulation-result__item--negative'
              }`}
            >
              <span>Resultado simulado</span>
              <strong>{formatarMoeda(saldoSimulado)}</strong>
            </div>
          </div>
        </SimulacaoSecao>

        {['receitas', 'investimentos'].map((tipo) => (
          <SimulacaoSecao
            key={tipo}
            categorias={categorias}
            medias={medias[tipo]}
            onAddCategoria={adicionarCategoria}
            onChangeValor={alterarValor}
            onRemoveCategoria={removerCategoria}
            rows={categoriasSelecionadas[tipo]}
            tipo={tipo}
            valoresEditados={valoresAtuais[tipo]}
          />
        ))}
      </div>
    </>
  )
}

export default Simulacao
