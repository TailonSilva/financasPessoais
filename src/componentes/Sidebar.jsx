import { NavLink } from 'react-router-dom'

const links = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.8 12 3l9 7.8" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </svg>
    ),
  },
  {
    to: '/fluxo-caixa',
    label: 'Fluxo de Caixa',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l3-3 3 2 5-7" />
        <path d="M16 7h3v3" />
      </svg>
    ),
  },
  {
    to: '/lancamentos',
    label: 'Lançamentos',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h10l3 3v15H4V3h3Z" />
        <path d="M16 3v4h4" />
        <path d="M8 11h8" />
        <path d="M8 15h8" />
      </svg>
    ),
  },
  {
    to: '/cartao-credito',
    label: 'Cartão de Crédito',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </svg>
    ),
  },
  {
    to: '/configuracoes',
    label: 'Configurações',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16" />
        <path d="M4 12h16" />
        <path d="M4 18h16" />
        <path d="M8 4v4" />
        <path d="M16 10v4" />
        <path d="M11 16v4" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Menu principal">
      <nav className="sidebar__nav">
        <ul className="sidebar__list">
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
                }
                aria-label={link.label}
                title={link.label}
              >
                {link.icon}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
