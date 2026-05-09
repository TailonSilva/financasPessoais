import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../componentes/PageHeader'
import { apiUrl } from '../utilitarios/fetch/api'

const cadastros = [
  {
    id: 'categorias',
    titulo: 'Categorias',
    descricao: 'Organize receitas, despesas, compras no cartão e transferências.',
    acao: 'Nova categoria',
    endpoint: '/api/categorias',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
      { campo: 'icone', titulo: 'Ícone' },
      { campo: 'cor', titulo: 'Cor' },
    ],
    campos: [
      { nome: 'descricao', label: 'Descrição', required: true },
      { nome: 'icone', label: 'Ícone' },
      { nome: 'cor', label: 'Cor', tipo: 'color', valorInicial: '#2d9cec' },
    ],
    variante: 'blue',
    icone: (
      <>
        <path d="M20 12v7a1 1 0 0 1-1 1h-7" />
        <path d="M4 12V5a1 1 0 0 1 1-1h7" />
        <path d="m4 12 8-8 8 8-8 8Z" />
      </>
    ),
  },
  {
    id: 'contas',
    titulo: 'Contas',
    descricao: 'Cadastre bancos, carteiras e contas usadas nos lançamentos.',
    acao: 'Nova conta',
    endpoint: '/api/contas',
    dependencias: ['tiposConta', 'bancos'],
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
      { campo: 'tipo_conta', titulo: 'Tipo' },
      { campo: 'banco', titulo: 'Banco' },
      { campo: 'saldoInicial', titulo: 'Saldo inicial', tipo: 'moeda' },
    ],
    campos: [
      { nome: 'descricao', label: 'Descrição', required: true },
      { nome: 'saldoInicial', label: 'Saldo inicial', tipo: 'number', valorInicial: '0', step: '0.01' },
      { nome: 'tipo_conta_id', label: 'Tipo de conta', tipo: 'select', opcoes: 'tiposConta' },
      { nome: 'banco_id', label: 'Banco', tipo: 'select', opcoes: 'bancos' },
      { nome: 'icone', label: 'Ícone' },
    ],
    variante: 'green',
    icone: (
      <>
        <path d="M3 10h18" />
        <path d="M5 10V8l7-4 7 4v2" />
        <path d="M6 10v8" />
        <path d="M10 10v8" />
        <path d="M14 10v8" />
        <path d="M18 10v8" />
        <path d="M4 18h16" />
      </>
    ),
  },
  {
    id: 'cartoes',
    titulo: 'Cartões de crédito',
    descricao: 'Configure cartões, limite, fechamento e vencimento da fatura.',
    acao: 'Novo cartão',
    endpoint: '/api/cartoes-credito',
    dependencias: ['contas'],
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
      { campo: 'conta', titulo: 'Conta' },
      { campo: 'limite', titulo: 'Limite', tipo: 'moeda' },
      { campo: 'dia_fechamento', titulo: 'Fechamento' },
      { campo: 'dia_vencimento', titulo: 'Vencimento' },
    ],
    campos: [
      { nome: 'descricao', label: 'Descrição', required: true },
      { nome: 'conta_id', label: 'Conta de pagamento', tipo: 'select', opcoes: 'contas', required: true },
      { nome: 'limite', label: 'Limite', tipo: 'number', step: '0.01', required: true },
      { nome: 'dia_fechamento', label: 'Dia de fechamento', tipo: 'number', min: 1, max: 31, required: true },
      { nome: 'dia_vencimento', label: 'Dia de vencimento', tipo: 'number', min: 1, max: 31, required: true },
      { nome: 'ativo', label: 'Ativo', tipo: 'checkbox', valorInicial: true },
    ],
    variante: 'indigo',
    icone: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
  },
  {
    id: 'bancos',
    titulo: 'Bancos',
    descricao: 'Mantenha os bancos disponíveis para vincular às contas.',
    acao: 'Novo banco',
    endpoint: '/api/bancos',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'nome', titulo: 'Nome' },
      { campo: 'imagem', titulo: 'Imagem' },
    ],
    campos: [
      { nome: 'nome', label: 'Nome', required: true },
      { nome: 'imagem', label: 'Imagem' },
    ],
    variante: 'yellow',
    icone: (
      <>
        <path d="M4 9h16" />
        <path d="M6 9V7l6-3 6 3v2" />
        <path d="M7 9v8" />
        <path d="M12 9v8" />
        <path d="M17 9v8" />
        <path d="M5 17h14" />
        <path d="M4 20h16" />
      </>
    ),
  },
  {
    id: 'tipos-conta',
    titulo: 'Tipos de conta',
    descricao: 'Defina os tipos usados para classificar cada conta cadastrada.',
    acao: 'Novo tipo',
    endpoint: '/api/tipos-conta',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
    ],
    campos: [{ nome: 'descricao', label: 'Descrição', required: true }],
    variante: 'red',
    icone: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
        <path d="M8 7v10" />
      </>
    ),
  },
]

const endpointsDependencias = {
  bancos: '/api/bancos',
  contas: '/api/contas',
  tiposConta: '/api/tipos-conta',
}

function formatarValor(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') {
    return '-'
  }

  if (tipo === 'moeda') {
    return Number(valor).toLocaleString('pt-BR', {
      currency: 'BRL',
      style: 'currency',
    })
  }

  return valor
}

function getValorInicial(cadastro) {
  return cadastro.campos.reduce((valores, campo) => {
    valores[campo.nome] = campo.valorInicial ?? ''
    return valores
  }, {})
}

function getOpcaoLabel(opcao) {
  return opcao.descricao || opcao.nome || opcao.titulo || `Registro ${opcao.id}`
}

function Configuracao() {
  const [cadastroAberto, setCadastroAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [registros, setRegistros] = useState([])
  const [opcoes, setOpcoes] = useState({})
  const [formulario, setFormulario] = useState({})
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [erroFormulario, setErroFormulario] = useState('')

  const tituloFormulario = useMemo(() => cadastroAberto?.acao || 'Novo registro', [cadastroAberto])

  useEffect(() => {
    if (!cadastroAberto) {
      return undefined
    }

    function fecharComEsc(event) {
      if (event.key === 'Escape') {
        if (formularioAberto) {
          setFormularioAberto(false)
          return
        }

        setCadastroAberto(null)
      }
    }

    window.addEventListener('keydown', fecharComEsc)

    return () => {
      window.removeEventListener('keydown', fecharComEsc)
    }
  }, [cadastroAberto, formularioAberto])

  async function carregarRegistros(cadastro) {
    setErro('')
    setCarregando(true)

    try {
      const resposta = await fetch(apiUrl(cadastro.endpoint))

      if (!resposta.ok) {
        throw new Error('Não foi possível carregar os dados.')
      }

      const dados = await resposta.json()
      setRegistros(Array.isArray(dados) ? dados : [])
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  async function abrirCadastro(cadastro) {
    setCadastroAberto(cadastro)
    setFormularioAberto(false)
    setRegistros([])
    setFormulario({})
    await carregarRegistros(cadastro)
  }

  async function carregarDependencias(cadastro) {
    const dependencias = cadastro.dependencias || []
    const pendentes = dependencias.filter((dependencia) => !opcoes[dependencia])

    if (pendentes.length === 0) {
      return
    }

    const resultados = await Promise.all(
      pendentes.map(async (dependencia) => {
        const resposta = await fetch(apiUrl(endpointsDependencias[dependencia]))

        if (!resposta.ok) {
          throw new Error('Não foi possível carregar os dados do formulário.')
        }

        return [dependencia, await resposta.json()]
      }),
    )

    setOpcoes((opcoesAtuais) => ({
      ...opcoesAtuais,
      ...Object.fromEntries(resultados),
    }))
  }

  async function incluirRegistro() {
    setErroFormulario('')

    try {
      await carregarDependencias(cadastroAberto)
      setFormulario(getValorInicial(cadastroAberto))
      setFormularioAberto(true)
    } catch (error) {
      setErroFormulario(error.message)
    }
  }

  function alterarCampo(nome, valor) {
    setFormulario((valoresAtuais) => ({
      ...valoresAtuais,
      [nome]: valor,
    }))
  }

  function montarPayload() {
    return cadastroAberto.campos.reduce((payload, campo) => {
      const valor = formulario[campo.nome]

      if (campo.tipo === 'checkbox') {
        payload[campo.nome] = valor ? 1 : 0
        return payload
      }

      if (campo.tipo === 'number') {
        payload[campo.nome] = valor === '' ? null : Number(valor)
        return payload
      }

      payload[campo.nome] = typeof valor === 'string' ? valor.trim() : valor
      return payload
    }, {})
  }

  async function salvarRegistro(event) {
    event.preventDefault()
    setErroFormulario('')
    setSalvando(true)

    try {
      const resposta = await fetch(apiUrl(cadastroAberto.endpoint), {
        body: JSON.stringify(montarPayload()),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      })

      if (!resposta.ok) {
        const erroResposta = await resposta.json().catch(() => ({}))
        throw new Error(erroResposta.error || 'Não foi possível salvar o registro.')
      }

      setFormularioAberto(false)
      await carregarRegistros(cadastroAberto)
    } catch (error) {
      setErroFormulario(error.message)
    } finally {
      setSalvando(false)
    }
  }

  function renderCampo(campo) {
    const valor = formulario[campo.nome] ?? ''

    if (campo.tipo === 'select') {
      const itens = opcoes[campo.opcoes] || []

      return (
        <select
          id={`settings-field-${campo.nome}`}
          value={valor}
          onChange={(event) => alterarCampo(campo.nome, event.target.value)}
          required={campo.required}
        >
          <option value="">Selecione</option>
          {itens.map((item) => (
            <option key={item.id} value={item.id}>
              {getOpcaoLabel(item)}
            </option>
          ))}
        </select>
      )
    }

    if (campo.tipo === 'checkbox') {
      return (
        <label className="settings-form__check">
          <input
            checked={Boolean(valor)}
            id={`settings-field-${campo.nome}`}
            onChange={(event) => alterarCampo(campo.nome, event.target.checked)}
            type="checkbox"
          />
          <span>{campo.label}</span>
        </label>
      )
    }

    return (
      <input
        id={`settings-field-${campo.nome}`}
        max={campo.max}
        min={campo.min}
        onChange={(event) => alterarCampo(campo.nome, event.target.value)}
        required={campo.required}
        step={campo.step}
        type={campo.tipo || 'text'}
        value={valor}
      />
    )
  }

  return (
    <>
      <PageHeader />
      <div className="container">
        <section className="settings-page">
          <div className="settings-page__title">
            <h1>Configurações</h1>
            <p>Cadastros base para deixar a aplicação pronta para uso.</p>
          </div>

          <div className="settings-grid">
            {cadastros.map((cadastro) => (
              <article className="settings-card" key={cadastro.titulo}>
                <div className={`settings-card__icon settings-card__icon--${cadastro.variante}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    {cadastro.icone}
                  </svg>
                </div>

                <div className="settings-card__content">
                  <h2>{cadastro.titulo}</h2>
                  <p>{cadastro.descricao}</p>
                </div>

                <button
                  className="settings-card__button"
                  type="button"
                  onClick={() => abrirCadastro(cadastro)}
                >
                  Abrir
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>

      {cadastroAberto && (
        <div
          className="settings-modal"
          role="presentation"
          onMouseDown={() => setCadastroAberto(null)}
        >
          <section
            className="settings-modal__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="settings-modal__header">
              <div>
                <h2 id="settings-modal-title">{cadastroAberto.titulo}</h2>
                <p>{cadastroAberto.descricao}</p>
              </div>

              <div className="settings-modal__actions">
                <button className="settings-modal__include" type="button" onClick={incluirRegistro}>
                  Incluir
                </button>
                <button
                  className="settings-modal__close"
                  type="button"
                  onClick={() => setCadastroAberto(null)}
                  aria-label="Fechar"
                  title="Fechar"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </div>
            </header>

            {erroFormulario && <p className="settings-modal__message">{erroFormulario}</p>}
            {erro && <p className="settings-modal__message">{erro}</p>}
            {carregando && <p className="settings-modal__message">Carregando...</p>}

            {!carregando && !erro && (
              <div className="settings-modal__grid-wrap">
                <table className="grid settings-modal__grid">
                  <thead>
                    <tr>
                      {cadastroAberto.colunas.map((coluna) => (
                        <th key={coluna.campo}>{coluna.titulo}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro) => (
                      <tr key={registro.id}>
                        {cadastroAberto.colunas.map((coluna) => (
                          <td key={coluna.campo}>
                            {formatarValor(registro[coluna.campo], coluna.tipo)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {registros.length === 0 && (
                      <tr>
                        <td colSpan={cadastroAberto.colunas.length}>
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {formularioAberto && (
            <section
              className="settings-form-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-form-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="settings-form-modal__header">
                <h2 id="settings-form-title">{tituloFormulario}</h2>
                <button
                  className="settings-modal__close"
                  type="button"
                  onClick={() => setFormularioAberto(false)}
                  aria-label="Fechar inclusão"
                  title="Fechar"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </header>

              <form className="settings-form" onSubmit={salvarRegistro}>
                {cadastroAberto.campos.map((campo) => (
                  <div
                    className={`settings-form__field ${
                      campo.tipo === 'checkbox' ? 'settings-form__field--check' : ''
                    }`}
                    key={campo.nome}
                  >
                    {campo.tipo !== 'checkbox' && (
                      <label htmlFor={`settings-field-${campo.nome}`}>{campo.label}</label>
                    )}
                    {renderCampo(campo)}
                  </div>
                ))}

                {erroFormulario && <p className="settings-form__error">{erroFormulario}</p>}

                <div className="settings-form__actions">
                  <button type="button" onClick={() => setFormularioAberto(false)}>
                    Cancelar
                  </button>
                  <button className="settings-modal__include" type="submit" disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      )}
    </>
  )
}

export default Configuracao
