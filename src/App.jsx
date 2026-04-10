import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Models from './pages/Models'
import Contracts from './pages/Contracts'
import Commissions from './pages/Commissions'
import Schools from './pages/Schools'
import Agents from './pages/Agents'
import SchoolView from './pages/SchoolView'
import AgentView from './pages/AgentView'

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
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<PrivateRoute requireRole="agency"><Layout /></PrivateRoute>}>
          <Route index            element={<Dashboard />} />
          <Route path="models"      element={<Models />} />
          <Route path="contracts"   element={<Contracts />} />
          <Route path="commissions" element={<Commissions />} />
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
