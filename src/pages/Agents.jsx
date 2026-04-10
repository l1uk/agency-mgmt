import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const empty = { name: '', commission_pct_exclusive: '10', commission_pct_open: '7' }

export default function Agents() {
  const [agents, setAgents]   = useState([])
  const [form, setForm]       = useState(empty)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  async function load() {
    const { data } = await supabase.from('agents').select('*').order('name')
    setAgents(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const startEdit = (a) => {
    setEditing(a.id)
    setForm({
      name:                    a.name,
      commission_pct_exclusive: String(a.commission_pct_exclusive ?? 10),
      commission_pct_open:      String(a.commission_pct_open      ?? 7),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) { flash('error', "Inserisci il nome dell'agente."); return }
    const excl = parseFloat(form.commission_pct_exclusive)
    const open = parseFloat(form.commission_pct_open)
    if (isNaN(excl) || excl < 0 || excl > 100) { flash('error', 'Percentuale esclusiva non valida.'); return }
    if (isNaN(open) || open < 0 || open > 100)  { flash('error', 'Percentuale non esclusiva non valida.'); return }

    setSaving(true)
    const payload = { name: form.name, commission_pct_exclusive: excl, commission_pct_open: open }
    const { error } = editing
      ? await supabase.from('agents').update(payload).eq('id', editing)
      : await supabase.from('agents').insert(payload)
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', editing ? 'Agente aggiornato.' : 'Agente aggiunto.')
    setEditing(null)
    setForm(empty)
    load()
  }

  const deleteAgent = async (id) => {
    const { data: linked } = await supabase
      .from('models').select('id').eq('agent_id', id).limit(1)
    if (linked?.length > 0) {
      flash('error', 'Impossibile eliminare: ci sono modelli associati a questo agente. Riassegna prima i modelli.')
      return
    }
    if (!confirm('Eliminare questo agente?')) return
    await supabase.from('agents').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Agenti</h2>
        <p>Gestione agenti e percentuali di provvigione</p>
      </div>

      <div className="card">
        <div className="card-title">{editing ? 'Modifica agente' : 'Nuovo agente'}</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Mesi 1–12: percentuale piena (diversa per esclusiva e non esclusiva). Dal mese 13 in poi: 5% fisso contrattuale.
        </p>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-3">
            <div className="field">
              <label>Nome agente *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Marco Rossi" />
            </div>
            <div className="field">
              <label>% Esclusiva (mesi 1–12)</label>
              <input type="number" step="0.01" min="0" max="100"
                value={form.commission_pct_exclusive} onChange={e => set('commission_pct_exclusive', e.target.value)} placeholder="10" />
            </div>
            <div className="field">
              <label>% Non esclusiva (mesi 1–12)</label>
              <input type="number" step="0.01" min="0" max="100"
                value={form.commission_pct_open} onChange={e => set('commission_pct_open', e.target.value)} placeholder="7" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : '+ Aggiungi agente'}
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(empty) }}>Annulla</button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Agenti registrati ({agents.length})</div>
        {agents.length === 0
          ? <div className="empty">Nessun agente ancora registrato.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Nome</th><th>% Esclusiva (1–12)</th><th>% Non esclusiva (1–12)</th><th>% dal mese 13</th><th></th></tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id} style={editing === a.id ? { background: '#fffbf0' } : {}}>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td style={{ fontWeight: 600 }}>{a.commission_pct_exclusive ?? a.commission_pct}%</td>
                      <td style={{ fontWeight: 600 }}>{a.commission_pct_open ?? a.commission_pct}%</td>
                      <td style={{ color: 'var(--text-2)' }}>5%</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(a)}>Modifica</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAgent(a.id)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </>
  )
}
