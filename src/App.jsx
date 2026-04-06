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

function PrivateRoute({ children, requireRole }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div className="loading">Caricamento...</div>
  if (!user) return <Navigate to="/login" replace />
  if (requireRole && role !== requireRole) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Agency routes */}
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="models" element={<Models />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="commissions" element={<Commissions />} />
          <Route path="schools" element={
            <PrivateRoute requireRole="agency"><Schools /></PrivateRoute>
          } />
          <Route path="agents" element={
            <PrivateRoute requireRole="agency"><Agents /></PrivateRoute>
          } />
        </Route>

        {/* School-only view */}
        <Route path="/school" element={
          <PrivateRoute requireRole="school">
            <SchoolView />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
