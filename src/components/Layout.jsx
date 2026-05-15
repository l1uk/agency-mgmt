import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useState } from 'react'
import packageJson from '../../package.json'

const links = [
  { to: '/',            icon: '⬡', label: 'Dashboard',   end: true },
  { to: '/commissions', icon: '◎', label: 'Provvigioni' },
  { to: '/jobs',        icon: '◻', label: 'Lavori'      },
  { to: '/pending-incomes', icon: '⧗', label: 'Incassi pendenti' },
  { to: '/models',      icon: '◯', label: 'Modelli'     },
  { to: '/agencies',    icon: '⬢', label: 'Agenzie'     },
  { to: '/schools',     icon: '▣', label: 'Scuole'      },
  { to: '/agents',      icon: '◈', label: 'Agenti'      },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const toggleSidebar = () => setSidebarOpen(s => !s)

  return (
    <div className="app-shell">
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
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
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-version">v{packageJson.version}</div>
          <div className="sidebar-user">{user?.email}</div>
          <button className="btn-signout" onClick={handleSignOut}>Esci</button>
        </div>
      </nav>

      {sidebarOpen && <div className="mobile-overlay" onClick={toggleSidebar} />}

      <main className="main">
        <div className="topbar-mobile">
          <button className="btn btn-ghost" onClick={toggleSidebar} style={{ marginRight: 8 }}>☰</button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
