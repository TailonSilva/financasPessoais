import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../componentes/PageHeader'
import { apiUrl } from '../utilitarios/fetch/api'
import { useNotificacoes } from '../componentes/notificacoesContext'

const logosBanco = [
  {
    label: 'Bradesco',
    value: 'bradesco.png',
    preview: new URL('../assets/img/bradesco.png', import.meta.url).href,
  },
  {
    label: 'Mercado Pago',
    value: 'mercado-pago.png',
    preview: new URL('../assets/img/mercado-pago.png', import.meta.url).href,
  },
  {
    label: 'Nubank',
    value: 'nubank.png',
    preview: new URL('../assets/img/nubank.png', import.meta.url).href,
  },
]

function getImagemBancoUrl(valor) {
  const logoPadrao = logosBanco.find((logo) => logo.value === valor)

  if (logoPadrao) {
    return logoPadrao.preview
  }

  if (valor?.startsWith('uploads/')) {
    return apiUrl(`/api/${valor}`)
  }

  return ''
}

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
      { campo: 'cor', titulo: 'Cor', tipo: 'cor' },
      { campo: 'ativo', titulo: 'Status', tipo: 'status' },
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
      { campo: 'ativo', titulo: 'Status', tipo: 'status' },
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
      { campo: 'ativo', titulo: 'Status', tipo: 'status' },
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
      { campo: 'imagem', titulo: 'Logo', tipo: 'logo' },
      { campo: 'cor', titulo: 'Cor', tipo: 'cor' },
      { campo: 'ativo', titulo: 'Status', tipo: 'status' },
    ],
    campos: [
      { nome: 'nome', label: 'Nome', required: true },
      { nome: 'imagem', label: 'Logo', tipo: 'logo-upload', required: true },
      { nome: 'cor', label: 'Cor', tipo: 'color', valorInicial: '#1e96f2' },
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
      { campo: 'ativo', titulo: 'Status', tipo: 'status' },
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

function endpointConfiguracao(endpoint) {
  const separador = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${separador}incluirInativos=1`
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

function getLogoBanco(nomeArquivo) {
  return logosBanco.find((logo) => logo.value === nomeArquivo)
}

function renderValorGrid(registro, coluna) {
  const valor = registro[coluna.campo]

  if (coluna.tipo === 'logo') {
    const logo = getLogoBanco(valor)
    const imagemUrl = getImagemBancoUrl(valor)

    if (!imagemUrl) {
      return formatarValor(valor)
    }

    return (
      <span className="settings-logo-cell">
        <img src={imagemUrl} alt="" />
        {logo?.label || 'Logo enviada'}
      </span>
    )
  }

  if (coluna.tipo === 'cor') {
    if (!valor) {
      return '-'
    }

    return (
      <span className="settings-color-cell">
        <span style={{ backgroundColor: valor }} />
        {valor}
      </span>
    )
  }

  if (coluna.tipo === 'status') {
    const ativo = valor !== 0

    return (
      <span className={`settings-status settings-status--${ativo ? 'active' : 'inactive'}`}>
        {ativo ? 'Ativo' : 'Inativo'}
      </span>
    )
  }

  return formatarValor(valor, coluna.tipo)
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
  const { notificarErro } = useNotificacoes()
  const [cadastroAberto, setCadastroAberto] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [registros, setRegistros] = useState([])
  const [opcoes, setOpcoes] = useState({})
  const [formulario, setFormulario] = useState({})
  const [registroEditando, setRegistroEditando] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [imagemTratamento, setImagemTratamento] = useState(null)

  const tituloFormulario = useMemo(
    () => (registroEditando ? `Editar ${cadastroAberto?.titulo}` : cadastroAberto?.acao || 'Novo registro'),
    [cadastroAberto, registroEditando],
  )

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
      const resposta = await fetch(apiUrl(endpointConfiguracao(cadastro.endpoint)))

      if (!resposta.ok) {
        throw new Error('Não foi possível carregar os dados.')
      }

      const dados = await resposta.json()
      setRegistros(Array.isArray(dados) ? dados : [])
    } catch (error) {
      setErro('erro')
      notificarErro(error.message)
    } finally {
      setCarregando(false)
    }
  }

  async function abrirCadastro(cadastro) {
    setCadastroAberto(cadastro)
    setFormularioAberto(false)
    setRegistroEditando(null)
    setRegistros([])
    setFormulario({})
    await carregarRegistros(cadastro)
  }

  async function carregarDependencias(cadastro) {
    const dependencias = cadastro.dependencias || []

    if (dependencias.length === 0) {
      return
    }

    const resultados = await Promise.all(
      dependencias.map(async (dependencia) => {
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
    try {
      await carregarDependencias(cadastroAberto)
      setRegistroEditando(null)
      setFormulario(getValorInicial(cadastroAberto))
      setFormularioAberto(true)
    } catch (error) {
      notificarErro(error.message)
    }
  }

  async function editarRegistro(registro) {
    try {
      await carregarDependencias(cadastroAberto)
      setRegistroEditando(registro)
      setFormulario(
        cadastroAberto.campos.reduce((valores, campo) => {
          valores[campo.nome] =
            campo.tipo === 'checkbox'
              ? registro[campo.nome] !== 0
              : registro[campo.nome] ?? campo.valorInicial ?? ''
          return valores
        }, {}),
      )
      setFormularioAberto(true)
    } catch (error) {
      notificarErro(error.message)
    }
  }

  function alterarCampo(nome, valor) {
    setFormulario((valoresAtuais) => ({
      ...valoresAtuais,
      [nome]: valor,
    }))
  }

  function escolherImagem(event, campo) {
    const arquivo = event.target.files?.[0]
    event.target.value = ''

    if (!arquivo) {
      return
    }

    if (!arquivo.type.startsWith('image/')) {
      notificarErro('Escolha um arquivo de imagem válido.')
      return
    }

    const leitor = new FileReader()

    leitor.onload = () => {
      setImagemTratamento({
        campoNome: campo.nome,
        nomeArquivo: arquivo.name,
        offsetX: 0,
        offsetY: 0,
        src: leitor.result,
        zoom: 1,
      })
    }

    leitor.readAsDataURL(arquivo)
  }

  function alterarImagemTratamento(campo, valor) {
    setImagemTratamento((imagemAtual) => ({
      ...imagemAtual,
      [campo]: Number(valor),
    }))
  }

  function gerarImagemTratada() {
    return new Promise((resolve, reject) => {
      const imagem = new Image()

      imagem.onload = () => {
        const larguraCanvas = 480
        const alturaCanvas = 300
        const canvas = document.createElement('canvas')
        const contexto = canvas.getContext('2d')
        const escalaBase = Math.min(larguraCanvas / imagem.width, alturaCanvas / imagem.height)
        const escala = escalaBase * imagemTratamento.zoom
        const largura = imagem.width * escala
        const altura = imagem.height * escala
        const x = (larguraCanvas - largura) / 2 + (imagemTratamento.offsetX / 100) * 120
        const y = (alturaCanvas - altura) / 2 + (imagemTratamento.offsetY / 100) * 75

        canvas.width = larguraCanvas
        canvas.height = alturaCanvas
        contexto.clearRect(0, 0, larguraCanvas, alturaCanvas)
        contexto.drawImage(imagem, x, y, largura, altura)
        resolve(canvas.toDataURL('image/png'))
      }

      imagem.onerror = () => reject(new Error('Não foi possível tratar a imagem.'))
      imagem.src = imagemTratamento.src
    })
  }

  async function aplicarImagemTratada() {
    try {
      const imagemFinal = await gerarImagemTratada()

      setFormulario((valoresAtuais) => ({
        ...valoresAtuais,
        [imagemTratamento.campoNome]: imagemFinal,
        [`${imagemTratamento.campoNome}_arquivo`]: imagemTratamento.nomeArquivo,
      }))
      setImagemTratamento(null)
    } catch (error) {
      notificarErro(error.message)
    }
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

  async function enviarLogoBancoSePreciso(payload) {
    if (cadastroAberto.id !== 'bancos' || !payload.imagem?.startsWith('data:image/')) {
      return payload
    }

    const resposta = await fetch(apiUrl('/api/uploads/bancos'), {
      body: JSON.stringify({
        imagemBase64: payload.imagem,
        nomeArquivo: formulario.imagem_arquivo,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })

    if (!resposta.ok) {
      const erroResposta = await resposta.json().catch(() => ({}))
      throw new Error(erroResposta.error || 'Não foi possível enviar a logo do banco.')
    }

    const dados = await resposta.json()

    return {
      ...payload,
      imagem: dados.arquivo,
    }
  }

  async function salvarRegistro(event) {
    event.preventDefault()
    setSalvando(true)

    try {
      const payload = await enviarLogoBancoSePreciso(montarPayload())
      const url = registroEditando
        ? `${cadastroAberto.endpoint}/${registroEditando.id}`
        : cadastroAberto.endpoint
      const resposta = await fetch(apiUrl(url), {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: registroEditando ? 'PUT' : 'POST',
      })

      if (!resposta.ok) {
        const erroResposta = await resposta.json().catch(() => ({}))
        throw new Error(erroResposta.error || 'Não foi possível salvar o registro.')
      }

      setFormularioAberto(false)
      setRegistroEditando(null)
      await carregarRegistros(cadastroAberto)
    } catch (error) {
      notificarErro(error.message)
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatusRegistro(registro) {
    const proximoAtivo = registro.ativo === 0 ? 1 : 0

    try {
      const resposta = await fetch(apiUrl(`${cadastroAberto.endpoint}/${registro.id}/ativo`), {
        body: JSON.stringify({ ativo: proximoAtivo }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      })

      if (!resposta.ok) {
        const erroResposta = await resposta.json().catch(() => ({}))
        throw new Error(erroResposta.error || 'Não foi possível alterar o status.')
      }

      await carregarRegistros(cadastroAberto)
    } catch (error) {
      notificarErro(error.message)
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
              {getOpcaoLabel(item)}{item.ativo === 0 ? ' (inativo)' : ''}
            </option>
          ))}
        </select>
      )
    }

    if (campo.tipo === 'logo-select') {
      return (
        <div className="settings-logo-options">
          {campo.opcoes.map((logo) => (
            <label
              className={`settings-logo-option ${
                valor === logo.value ? 'settings-logo-option--selected' : ''
              }`}
              key={logo.value}
            >
              <input
                checked={valor === logo.value}
                name={campo.nome}
                onChange={() => alterarCampo(campo.nome, logo.value)}
                required={campo.required}
                type="radio"
                value={logo.value}
              />
              <img src={logo.preview} alt="" />
              <span>{logo.label}</span>
            </label>
          ))}
        </div>
      )
    }

    if (campo.tipo === 'logo-upload') {
      const preview = valor?.startsWith('data:image/') ? valor : getImagemBancoUrl(valor)

      return (
        <div className="settings-upload-logo">
          <label className="settings-upload-logo__button">
            <input
              accept="image/*"
              onChange={(event) => escolherImagem(event, campo)}
              type="file"
            />
            Carregar imagem
          </label>

          {preview ? (
            <div className="settings-upload-logo__preview">
              <img src={preview} alt="" />
            </div>
          ) : (
            <div className="settings-upload-logo__empty">Nenhuma logo selecionada.</div>
          )}
        </div>
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

            {carregando && <p className="settings-modal__message">Carregando...</p>}

            {!carregando && !erro && (
              <div className="settings-modal__grid-wrap">
                <table className="grid settings-modal__grid">
                  <thead>
                    <tr>
                      {cadastroAberto.colunas.map((coluna) => (
                        <th key={coluna.campo}>{coluna.titulo}</th>
                      ))}
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((registro) => (
                      <tr key={registro.id}>
                        {cadastroAberto.colunas.map((coluna) => (
                          <td key={coluna.campo}>
                            {renderValorGrid(registro, coluna)}
                          </td>
                        ))}
                        <td>
                          <div className="settings-grid-actions">
                            <button type="button" onClick={() => editarRegistro(registro)}>
                              Editar
                            </button>
                            <button type="button" onClick={() => alternarStatusRegistro(registro)}>
                              {registro.ativo === 0 ? 'Ativar' : 'Inativar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {registros.length === 0 && (
                      <tr>
                        <td colSpan={cadastroAberto.colunas.length + 1}>
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

          {imagemTratamento && (
            <section
              className="settings-image-editor"
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-image-editor-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <header className="settings-form-modal__header">
                <h2 id="settings-image-editor-title">Tratar imagem</h2>
                <button
                  className="settings-modal__close"
                  type="button"
                  onClick={() => setImagemTratamento(null)}
                  aria-label="Fechar tratamento"
                  title="Fechar"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12" />
                    <path d="M18 6 6 18" />
                  </svg>
                </button>
              </header>

              <div className="settings-image-editor__canvas">
                <img
                  src={imagemTratamento.src}
                  alt=""
                  style={{
                    transform: `translate(${imagemTratamento.offsetX}px, ${imagemTratamento.offsetY}px) scale(${imagemTratamento.zoom})`,
                  }}
                />
              </div>

              <div className="settings-image-editor__controls">
                <label>
                  Zoom
                  <input
                    min="0.5"
                    max="3"
                    onChange={(event) => alterarImagemTratamento('zoom', event.target.value)}
                    step="0.05"
                    type="range"
                    value={imagemTratamento.zoom}
                  />
                </label>
                <label>
                  Horizontal
                  <input
                    min="-100"
                    max="100"
                    onChange={(event) => alterarImagemTratamento('offsetX', event.target.value)}
                    step="1"
                    type="range"
                    value={imagemTratamento.offsetX}
                  />
                </label>
                <label>
                  Vertical
                  <input
                    min="-100"
                    max="100"
                    onChange={(event) => alterarImagemTratamento('offsetY', event.target.value)}
                    step="1"
                    type="range"
                    value={imagemTratamento.offsetY}
                  />
                </label>
              </div>

              <div className="settings-form__actions">
                <button type="button" onClick={() => setImagemTratamento(null)}>
                  Cancelar
                </button>
                <button className="settings-modal__include" type="button" onClick={aplicarImagemTratada}>
                  Aplicar
                </button>
              </div>
            </section>
          )}
        </div>
      )}
    </>
  )
}

export default Configuracao
