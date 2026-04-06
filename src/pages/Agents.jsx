import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const empty = { name: '', commission_pct_exclusive: '10', commission_pct_open: '7' }

export default function Agents() {
  const [agents, setAgents]   = useState([])
  const [form, setForm]       = useState(empty)
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
    setTimeout(() => setMsg(null), 3000)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) { flash('error', 'Inserisci il nome dell\'agente.'); return }
    const excl = parseFloat(form.commission_pct_exclusive)
    const open = parseFloat(form.commission_pct_open)
    if (isNaN(excl) || excl < 0 || excl > 100) { flash('error', 'Percentuale esclusiva non valida.'); return }
    if (isNaN(open) || open < 0 || open > 100) { flash('error', 'Percentuale non esclusiva non valida.'); return }

    setSaving(true)
    const { error } = await supabase.from('agents').insert({
      name: form.name,
      commission_pct_exclusive: excl,
      commission_pct_open:      open,
    })
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', 'Agente aggiunto.')
    setForm(empty)
    load()
  }

  const deleteAgent = async (id) => {
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
        <div className="card-title">Nuovo agente</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Le percentuali variano in base al tipo di contratto (esclusiva o non esclusiva).
          Per i primi 12 mesi si applica la percentuale piena, dal 13° mese si riduce al 5%.
        </p>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-3">
            <div className="field">
              <label>Nome agente *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Marco Rossi" />
            </div>
            <div className="field">
              <label>% Esclusiva (mesi 1-12)</label>
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.commission_pct_exclusive}
                onChange={e => set('commission_pct_exclusive', e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="field">
              <label>% Non esclusiva (mesi 1-12)</label>
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.commission_pct_open}
                onChange={e => set('commission_pct_open', e.target.value)}
                placeholder="7"
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : '+ Aggiungi agente'}
            </button>
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
                  <tr>
                    <th>Nome</th>
                    <th>% Esclusiva (mesi 1-12)</th>
                    <th>% Non esclusiva (mesi 1-12)</th>
                    <th>% dal mese 13</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td style={{ fontWeight: 600 }}>{a.commission_pct_exclusive ?? a.commission_pct}%</td>
                      <td style={{ fontWeight: 600 }}>{a.commission_pct_open ?? a.commission_pct}%</td>
                      <td style={{ color: 'var(--text-2)' }}>5%</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteAgent(a.id)}>✕</button>
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
