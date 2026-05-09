import { useEffect, useState } from 'react'
import { PageHeader } from '../componentes/PageHeader'

const cadastros = [
  {
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
    titulo: 'Contas',
    descricao: 'Cadastre bancos, carteiras e contas usadas nos lançamentos.',
    acao: 'Nova conta',
    endpoint: '/api/contas',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
      { campo: 'tipo_conta', titulo: 'Tipo' },
      { campo: 'banco', titulo: 'Banco' },
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
    titulo: 'Cartões de crédito',
    descricao: 'Configure cartões, limite, fechamento e vencimento da fatura.',
    acao: 'Novo cartão',
    endpoint: '/api/cartoes-credito',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
      { campo: 'conta', titulo: 'Conta' },
      { campo: 'limite', titulo: 'Limite', tipo: 'moeda' },
      { campo: 'dia_fechamento', titulo: 'Fechamento' },
      { campo: 'dia_vencimento', titulo: 'Vencimento' },
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
    titulo: 'Bancos',
    descricao: 'Mantenha os bancos disponíveis para vincular às contas.',
    acao: 'Novo banco',
    endpoint: '/api/bancos',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'nome', titulo: 'Nome' },
      { campo: 'imagem', titulo: 'Imagem' },
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
    titulo: 'Tipos de conta',
    descricao: 'Defina os tipos usados para classificar cada conta cadastrada.',
    acao: 'Novo tipo',
    endpoint: '/api/tipos-conta',
    colunas: [
      { campo: 'id', titulo: 'ID' },
      { campo: 'descricao', titulo: 'Descrição' },
    ],
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

function Configuracao() {
  const [cadastroAberto, setCadastroAberto] = useState(null)
  const [registros, setRegistros] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!cadastroAberto) {
      return undefined
    }

    function fecharComEsc(event) {
      if (event.key === 'Escape') {
        setCadastroAberto(null)
      }
    }

    window.addEventListener('keydown', fecharComEsc)

    return () => {
      window.removeEventListener('keydown', fecharComEsc)
    }
  }, [cadastroAberto])

  async function abrirCadastro(cadastro) {
    setCadastroAberto(cadastro)
    setRegistros([])
    setErro('')
    setCarregando(true)

    try {
      const resposta = await fetch(cadastro.endpoint)

      if (!resposta.ok) {
        throw new Error('Não foi possível carregar os dados.')
      }

      const dados = await resposta.json()
      setRegistros(dados)
    } catch (error) {
      setErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  function incluirRegistro() {
    console.log(`Incluir registro em: ${cadastroAberto?.titulo}`)
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
        </div>
      )}
    </>
  )
}

export default Configuracao
