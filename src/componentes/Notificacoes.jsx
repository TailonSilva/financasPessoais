import { useCallback, useMemo, useState } from 'react'
import { NotificacoesContext } from './notificacoesContext'

function criarId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function NotificacoesProvider({ children }) {
  const [notificacoes, setNotificacoes] = useState([])

  const removerNotificacao = useCallback((id) => {
    setNotificacoes((atuais) => atuais.filter((notificacao) => notificacao.id !== id))
  }, [])

  const notificar = useCallback(
    ({ mensagem, tipo = 'erro', duracao = 6000 }) => {
      if (!mensagem) {
        return
      }

      const id = criarId()

      setNotificacoes((atuais) => [
        ...atuais,
        {
          id,
          mensagem,
          tipo,
        },
      ])

      window.setTimeout(() => removerNotificacao(id), duracao)
    },
    [removerNotificacao],
  )

  const valor = useMemo(
    () => ({
      notificar,
      notificarAviso: (mensagem) => notificar({ mensagem, tipo: 'aviso' }),
      notificarErro: (mensagem) => notificar({ mensagem, tipo: 'erro' }),
      notificarSucesso: (mensagem) => notificar({ mensagem, tipo: 'sucesso' }),
    }),
    [notificar],
  )

  return (
    <NotificacoesContext.Provider value={valor}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {notificacoes.map((notificacao) => (
          <div
            className={`toast toast--${notificacao.tipo}`}
            key={notificacao.id}
            role="status"
          >
            <span>{notificacao.mensagem}</span>
            <button
              type="button"
              onClick={() => removerNotificacao(notificacao.id)}
              aria-label="Fechar mensagem"
              title="Fechar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </NotificacoesContext.Provider>
  )
}
