import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const empty = { first_name: '', last_name: '', school_id: '', agent_id: '', notes: '' }

export default function Models() {
  const [models, setModels]   = useState([])
  const [schools, setSchools] = useState([])
  const [agents, setAgents]   = useState([])
  const [form, setForm]       = useState(empty)
  const [msg, setMsg]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  async function load() {
    const [{ data: m }, { data: s }, { data: a }] = await Promise.all([
      supabase.from('models').select('*, schools(name), agents(name)').order('last_name'),
      supabase.from('schools').select('id, name').order('name'),
      supabase.from('agents').select('id, name').order('name'),
    ])
    setModels(m ?? [])
    setSchools(s ?? [])
    setAgents(a ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      setMsg({ type: 'error', text: 'Nome e cognome sono obbligatori.' }); return
    }
    setSaving(true)
    const { error } = await supabase.from('models').insert({
      first_name: form.first_name,
      last_name:  form.last_name,
      school_id:  form.school_id  || null,
      agent_id:   form.agent_id   || null,
      notes:      form.notes      || null,
    })
    setSaving(false)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'success', text: 'Modello aggiunto.' })
    setForm(empty)
    load()
    setTimeout(() => setMsg(null), 3000)
  }

  const deleteModel = async (id) => {
    if (!confirm('Impossibile eliminare un modello con contratti associati.')) return
    await supabase.from('models').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Modelli</h2>
        <p>Archivio modelli con scuola e agente associati</p>
      </div>

      <div className="card">
        <div className="card-title">Nuovo modello</div>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-2">
            <div className="field">
              <label>Nome *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Sofia" />
            </div>
            <div className="field">
              <label>Cognome *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Ferrari" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="field">
              <label>Scuola</label>
              <select value={form.school_id} onChange={e => set('school_id', e.target.value)}>
                <option value="">— nessuna —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Agente</label>
              <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)}>
                <option value="">— nessuno —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Note opzionali..." />
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : '+ Aggiungi modello'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Tutti i modelli ({models.length})</div>
        {models.length === 0
          ? <div className="empty">Nessun modello ancora registrato.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Scuola</th>
                    <th>Agente</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.id}>
                      <td style={{ fontWeight: 500 }}>{m.last_name} {m.first_name}</td>
                      <td>{m.schools?.name ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                      <td>{m.agents?.name  ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.notes}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteModel(m.id)}>✕</button>
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
