import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchableSelect from '../components/SearchableSelect'
import { formatDateShort } from '../lib/format'
import DateInput from '../components/DateInput'

const empty = { first_name: '', last_name: '', agency_id: '', hunt_signed_at: '', school_id: '', agent_id: '', notes: '' }

export default function Models() {
  const [models, setModels]     = useState([])
  const [agencies, setAgencies] = useState([])
  const [schools, setSchools]   = useState([])
  const [agents, setAgents]     = useState([])
  const [form, setForm]         = useState(empty)
  const [editing, setEditing]   = useState(null)   // id being edited
  const [msg, setMsg]           = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const agencyOptions = agencies.map(a => ({ value: a.id, label: `${a.name} (${a.hunt_pct}%)` }))
  const schoolOptions = schools.map(s => ({ value: s.id, label: s.name }))
  const agentOptions  = agents.map(a => ({ value: a.id, label: a.name }))

  async function load() {
    const [{ data: m }, { data: ag }, { data: s }, { data: a }] = await Promise.all([
      supabase.from('models').select('*, schools(name), agents(name), agencies(name, hunt_pct)').order('last_name'),
      supabase.from('agencies').select('id, name, hunt_pct').order('name'),
      supabase.from('schools').select('id, name').order('name'),
      supabase.from('agents').select('id, name').order('name'),
    ])
    setModels(m ?? [])
    setAgencies(ag ?? [])
    setSchools(s ?? [])
    setAgents(a ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const startEdit = (m) => {
    setEditing(m.id)
    setForm({
      first_name: m.first_name,
      last_name:  m.last_name,
      agency_id:  m.agency_id ?? '',
      hunt_signed_at: m.hunt_signed_at ?? '',
      school_id:  m.school_id ?? '',
      agent_id:   m.agent_id  ?? '',
      notes:      m.notes     ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => { setEditing(null); setForm(empty) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name) {
      flash('error', 'Nome e cognome sono obbligatori.'); return
    }
    if (!form.agency_id) {
      flash('error', "Seleziona un'agenzia."); return
    }
    setSaving(true)
    const payload = {
      first_name: form.first_name,
      last_name:  form.last_name,
      agency_id:  form.agency_id || null,
      hunt_signed_at: form.hunt_signed_at || null,
      school_id:  form.school_id || null,
      agent_id:   form.agent_id  || null,   // explicitly null when empty
      notes:      form.notes     || null,
    }
    const { error } = editing
      ? await supabase.from('models').update(payload).eq('id', editing)
      : await supabase.from('models').insert(payload)
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', editing ? 'Modello aggiornato.' : 'Modello aggiunto.')
    setEditing(null)
    setForm(empty)
    load()
  }

  const deleteModel = async (id) => {
    // Check for linked jobs first
    const { data: linked } = await supabase
      .from('jobs').select('id').eq('model_id', id).limit(1)
    if (linked?.length > 0) {
      flash('error', 'Impossibile eliminare: questo modello ha lavori associati. Elimina prima i lavori.')
      return
    }
    if (!confirm('Eliminare questo modello?')) return
    await supabase.from('models').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Modelli</h2>
        <p>Archivio modelli con agenzia, scuola o agente associati</p>
      </div>

      <div className="card">
        <div className="card-title">{editing ? 'Modifica modello' : 'Nuovo modello'}</div>
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
            <SearchableSelect
              label="Agenzia"
              value={form.agency_id}
              onChange={value => set('agency_id', value)}
              options={agencyOptions}
              placeholder="Seleziona agenzia"
              required
            />
            <div className="field">
              <label>Data firma con Hunt</label>
              <DateInput value={form.hunt_signed_at} onChange={v => set('hunt_signed_at', v)} />
            </div>
          </div>
          <div className="form-row-2">
            <SearchableSelect
              label={<>Scuola {form.agent_id && <span style={{color:'var(--danger)',fontSize:11,marginLeft:6}}>⚠ non disponibile se c'è un agente</span>}</>}
              value={form.school_id}
              onChange={value => { set('school_id', value); if (value) set('agent_id', '') }}
              options={schoolOptions}
              emptyLabel="— nessuna —"
              placeholder="Seleziona scuola"
            />
            <SearchableSelect
              label={<>Agente {form.school_id && <span style={{color:'var(--danger)',fontSize:11,marginLeft:6}}>⚠ non disponibile se c'è una scuola</span>}</>}
              value={form.agent_id}
              onChange={value => set('agent_id', value)}
              options={agentOptions}
              emptyLabel="— nessuno —"
              placeholder="Seleziona agente"
              disabled={!!form.school_id}
            />
          </div>
          <div className="field">
            <label>Note</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Note opzionali..." />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : '+ Aggiungi modello'}
            </button>
            {editing && (
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Annulla</button>
            )}
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
                  <tr><th>Nome</th><th>Agenzia</th><th>Scuola</th><th>Agente</th><th>Firma Hunt</th><th>Note</th><th></th></tr>
                </thead>
                <tbody>
                  {models.map(m => (
                    <tr key={m.id} style={editing === m.id ? { background: '#fffbf0' } : {}}>
                      <td style={{ fontWeight: 500 }}>{m.last_name} {m.first_name}</td>
                      <td>{m.agencies?.name ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                      <td>{m.schools?.name ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                      <td>
                        {m.agents?.name
                          ? m.agents.name
                          : <span style={{ color: 'var(--text-3)' }}>—</span>}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{formatDateShort(m.hunt_signed_at)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.notes}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(m)}>Modifica</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteModel(m.id)}>✕</button>
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
