import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function destinationForRole(role) {
  return role === 'school' ? '/school' : role === 'agent' ? '/agent' : '/'
}

export default function SetPassword() {
  const navigate = useNavigate()
  const { user, role, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('La password deve contenere almeno 8 caratteri.')
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess('Password impostata correttamente.')
    navigate(destinationForRole(role), { replace: true })
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-main">HUNT MODELS</div>
          <div className="login-brand-sub">Imposta Password</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="field">
            <label>Nuova password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Almeno 8 caratteri"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Conferma password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva password'}
          </button>
        </form>
      </div>
    </div>
  )
}
