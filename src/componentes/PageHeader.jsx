import { useState } from 'react'

const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const mesAtual = () => new Date().getMonth() + 1
const anoAtual = () => new Date().getFullYear()

export function PageHeader({ actions }) {
  return (
    <header className="page-header">
      <div className="page-header__brand">
        <span className="page-header__logo" aria-hidden="true">
          <img src="src/assets/logo/logo200px-sf.png" alt="" />
        </span>
        <h6>Minhas Finanças</h6>
      </div>

      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

export function MesSelector({ value, onChange, year, onYearChange }) {
  const [mesInterno, setMesInterno] = useState(mesAtual)
  const mesSelecionado = value ?? mesInterno

  function atualizarMes(proximoMes) {
    if (onChange) {
      onChange(proximoMes)
      return
    }

    setMesInterno(proximoMes)
  }

  function selecionarMesAnterior() {
    if (mesSelecionado === 1) {
      atualizarMes(meses.length)

      if (onYearChange && year) {
        onYearChange(year - 1)
      }

      return
    }

    atualizarMes(mesSelecionado - 1)
  }

  function selecionarProximoMes() {
    if (mesSelecionado === meses.length) {
      atualizarMes(1)

      if (onYearChange && year) {
        onYearChange(year + 1)
      }

      return
    }

    atualizarMes(mesSelecionado + 1)
  }

  return (
    <div className="period-select" aria-label="Selecionar mês">
      <button
        className="period-select__button"
        type="button"
        onClick={selecionarMesAnterior}
        aria-label="Mês anterior"
        title="Mês anterior"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <span className="period-select__value">{meses[mesSelecionado - 1]}</span>

      <button
        className="period-select__button"
        type="button"
        onClick={selecionarProximoMes}
        aria-label="Próximo mês"
        title="Próximo mês"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}

export function AnoSelector({ value, onChange }) {
  const [anoInterno, setAnoInterno] = useState(anoAtual)
  const anoSelecionado = value ?? anoInterno

  function atualizarAno(proximoAno) {
    if (onChange) {
      onChange(proximoAno)
      return
    }

    setAnoInterno(proximoAno)
  }

  return (
    <div className="period-select period-select--year" aria-label="Selecionar ano">
      <button
        className="period-select__button"
        type="button"
        onClick={() => atualizarAno(anoSelecionado - 1)}
        aria-label="Ano anterior"
        title="Ano anterior"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <span className="period-select__value">{anoSelecionado}</span>

      <button
        className="period-select__button"
        type="button"
        onClick={() => atualizarAno(anoSelecionado + 1)}
        aria-label="Próximo ano"
        title="Próximo ano"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}

export function HeaderActionButton({ children, label, onClick }) {
  return (
    <button
      className="page-header__button"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
