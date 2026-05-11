import { createContext, useContext } from 'react'

export const NotificacoesContext = createContext(null)

export function useNotificacoes() {
  const contexto = useContext(NotificacoesContext)

  if (!contexto) {
    throw new Error('useNotificacoes deve ser usado dentro de NotificacoesProvider.')
  }

  return contexto
}
