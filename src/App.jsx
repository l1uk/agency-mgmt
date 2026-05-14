import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Models from './pages/Models'
import Jobs from './pages/Jobs'
import Commissions from './pages/Commissions'
import Agencies from './pages/Agencies'
import Schools from './pages/Schools'
import Agents from './pages/Agents'
import PendingIncomes from './pages/PendingIncomes'
import SchoolView from './pages/SchoolView'
import AgentView from './pages/AgentView'
import SetPassword from './pages/SetPassword'

function InviteRecoveryRedirect() {
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hash = new URLSearchParams(hashRaw)

  const type = query.get('type') || hash.get('type')
  const isInviteOrRecovery = type === 'invite' || type === 'recovery'
  const hasAuthTokens = hash.has('access_token') || hash.has('refresh_token')
  const shouldRedirectToSetPassword =
    location.pathname !== '/set-password' &&
    (isInviteOrRecovery || hasAuthTokens)

  if (shouldRedirectToSetPassword) {
    return <Navigate to={`/set-password${location.search}${location.hash}`} replace />
  }

  return null
}

function PrivateRoute({ children, requireRole }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="loading">Caricamento...</div>
  if (!user)   return <Navigate to="/login" replace />
  if (role === 'school' && requireRole !== 'school') return <Navigate to="/school" replace />
  if (role === 'agent'  && requireRole !== 'agent')  return <Navigate to="/agent"  replace />
  if (requireRole && role !== requireRole) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <InviteRecoveryRedirect />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/set-password" element={<SetPassword />} />

        <Route path="/" element={<PrivateRoute requireRole="agency"><Layout /></PrivateRoute>}>
          <Route index            element={<Dashboard />} />
          <Route path="models"      element={<Models />} />
          <Route path="jobs"        element={<Jobs />} />
          <Route path="contracts"   element={<Navigate to="/jobs" replace />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="agencies"    element={<Agencies />} />
          <Route path="pending-incomes" element={<PendingIncomes />} />
          <Route path="schools"     element={<Schools />} />
          <Route path="agents"      element={<Agents />} />
        </Route>

        <Route path="/school" element={<PrivateRoute requireRole="school"><SchoolView /></PrivateRoute>} />
        <Route path="/agent"  element={<PrivateRoute requireRole="agent"><AgentView /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
