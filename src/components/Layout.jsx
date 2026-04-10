import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const links = [
  { to: '/',            icon: '⬡', label: 'Dashboard',   end: true },
  { to: '/commissions', icon: '◎', label: 'Provvigioni' },
  { to: '/contracts',   icon: '◻', label: 'Contratti'   },
  { to: '/models',      icon: '◯', label: 'Modelli'     },
  { to: '/schools',     icon: '▣', label: 'Scuole'      },
  { to: '/agents',      icon: '◈', label: 'Agenti'      },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-wordmark">HUNT</div>
          <div className="sidebar-wordmark-sub">MODELS</div>
          <div className="sidebar-divider" />
          <span className="sidebar-label">Gestionale</span>
        </div>

        <div className="sidebar-nav">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.email}</div>
          <button className="btn-signout" onClick={handleSignOut}>Esci</button>
        </div>
      </nav>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
