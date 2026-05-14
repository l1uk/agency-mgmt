import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const empty = { name: '', hunt_pct: '' }

export default function Agencies() {
  const [agencies, setAgencies] = useState([])
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('agencies').select('id, name, hunt_pct, created_at').order('name')
    setAgencies(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const startEdit = (agency) => {
    setEditing(agency.id)
    setForm({
      name: agency.name,
      hunt_pct: String(agency.hunt_pct ?? 0),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) {
      flash('error', 'Inserisci il nome dell’agenzia.')
      return
    }

    const pct = parseFloat(form.hunt_pct)
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      flash('error', 'La percentuale Hunt deve essere tra 0 e 100.')
      return
    }

    setSaving(true)
    const payload = {
      name: form.name,
      hunt_pct: pct,
    }

    const { error } = editing
      ? await supabase.from('agencies').update(payload).eq('id', editing)
      : await supabase.from('agencies').insert(payload)

    setSaving(false)
    if (error) {
      flash('error', error.message)
      return
    }

    flash('success', editing ? 'Agenzia aggiornata.' : 'Agenzia aggiunta.')
    setEditing(null)
    setForm(empty)
    load()
  }

  const deleteAgency = async (id) => {
    const { data: linked } = await supabase.from('models').select('id').eq('agency_id', id).limit(1)
    if (linked?.length > 0) {
      flash('error', 'Impossibile eliminare: ci sono modelli associati a questa agenzia.')
      return
    }
    if (!confirm('Eliminare questa agenzia?')) return
    const { error } = await supabase.from('agencies').delete().eq('id', id)
    if (error) {
      flash('error', error.message)
      return
    }
    load()
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Agenzie</h2>
        <p>Anagrafica agenzie e percentuale Hunt</p>
      </div>

      <div className="card">
        <div className="card-title">{editing ? 'Modifica agenzia' : 'Nuova agenzia'}</div>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-2">
            <div className="field">
              <label>Nome agenzia *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Hunt Milano" />
            </div>
            <div className="field">
              <label>Percentuale Hunt % *</label>
              <input type="number" step="0.01" min="0" max="100" value={form.hunt_pct}
                onChange={e => setForm(f => ({ ...f, hunt_pct: e.target.value }))} placeholder="15" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : '+ Aggiungi agenzia'}
            </button>
            {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(empty) }}>Annulla</button>}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Agenzie registrate ({agencies.length})</div>
        {agencies.length === 0
          ? <div className="empty">Nessuna agenzia ancora registrata.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nome</th><th>% Hunt</th><th>Creata il</th><th></th></tr>
                </thead>
                <tbody>
                  {agencies.map(agency => (
                    <tr key={agency.id} style={editing === agency.id ? { background: '#fffbf0' } : {}}>
                      <td style={{ fontWeight: 500 }}>{agency.name}</td>
                      <td className="mono">{agency.hunt_pct}%</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{agency.created_at?.slice(0, 10)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(agency)}>Modifica</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAgency(agency.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  )
}
