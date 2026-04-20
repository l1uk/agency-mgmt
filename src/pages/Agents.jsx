import { useState, useEffect } from 'react'
import { supabase, invokeEdgeFunction, getFreshAccessToken } from '../lib/supabase'

const empty = {
  name: '',
  email: '',
  is_giorgio_agent: false,
  commission_pct_exclusive: '10',
  commission_pct_open: '7',
}

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
      email:                   a.email ?? '',
      is_giorgio_agent:        a.is_giorgio_agent ?? false,
      commission_pct_exclusive: String(a.commission_pct_exclusive ?? 10),
      commission_pct_open:      String(a.commission_pct_open      ?? 7),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name) { flash('error', "Inserisci il nome dell'agente."); return }
    const normalizedEmail = form.email.trim().toLowerCase()

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      flash('error', 'Inserisci un indirizzo email valido.')
      return
    }

    if (normalizedEmail) {
      const duplicateQuery = supabase
        .from('agents')
        .select('id, name, email')
        .ilike('email', normalizedEmail)
        .limit(1)

      const { data: duplicate, error: duplicateError } = editing
        ? await duplicateQuery.neq('id', editing)
        : await duplicateQuery

      if (duplicateError) {
        flash('error', duplicateError.message)
        return
      }

      if (duplicate?.length) {
        flash('error', 'Esiste gia un agente con questa email.')
        return
      }
    }

    const excl = parseFloat(form.commission_pct_exclusive)
    const open = parseFloat(form.commission_pct_open)
    if (isNaN(excl) || excl < 0 || excl > 100) { flash('error', 'Percentuale esclusiva non valida.'); return }
    if (isNaN(open) || open < 0 || open > 100)  { flash('error', 'Percentuale non esclusiva non valida.'); return }

    if (form.is_giorgio_agent) {
      const query = supabase
        .from('agents')
        .select('id, name')
        .eq('is_giorgio_agent', true)
        .limit(1)

      const { data: existingGiorgio } = editing
        ? await query.neq('id', editing)
        : await query

      if (existingGiorgio?.length) {
        flash('error', "Esiste gia un agente impostato come Giorgio. Rimuovi prima il flag dall'agente esistente.")
        return
      }
    }

    setSaving(true)
    const payload = {
      name: form.name,
      email: normalizedEmail || null,
      is_giorgio_agent: !!form.is_giorgio_agent,
      commission_pct_exclusive: excl,
      commission_pct_open: open,
    }
    const { error } = editing
      ? await supabase.from('agents').update(payload).eq('id', editing)
      : await supabase.from('agents').insert(payload)
    setSaving(false)
    if (error) {
      if (error.message?.includes('agents_single_giorgio_agent_idx')) {
        flash('error', "Esiste gia un agente impostato come Giorgio. Rimuovi prima il flag dall'agente esistente.")
        return
      }
      if (error.message?.includes('agents_email_unique_idx')) {
        flash('error', 'Esiste gia un agente con questa email.')
        return
      }
      flash('error', error.message)
      return
    }
    flash('success', editing ? 'Agente aggiornato.' : 'Agente aggiunto.')
    setEditing(null)
    setForm(empty)
    load()
  }

  const inviteAgent = async (agent) => {
    if (!agent.email) {
      flash('error', "Inserisci prima l'email dell'agente, poi salva.")
      return
    }

    let accessToken = null
    try {
      accessToken = await getFreshAccessToken()
    } catch {
      accessToken = null
    }

    if (!accessToken) {
      flash('error', 'Sessione non valida. Esci e rientra prima di inviare l’invito.')
      return
    }

    const { data, error } = await invokeEdgeFunction('invite-agent-account', {
      accessToken,
      body: { agentId: agent.id },
    })

    if (error || !data?.ok) {
      flash('error', data?.error ?? error?.message ?? "Invito agente non riuscito.")
      return
    }

    if (data.mode === 'relinked_existing_user') {
      flash('success', `Account esistente ricollegato a ${agent.email}.`)
    } else {
      flash('success', `Invito inviato a ${agent.email}.`)
    }
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
    const { error } = await supabase.from('agents').delete().eq('id', id)
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
        <h2>Agenti</h2>
        <p>Gestione agenti e percentuali di provvigione</p>
      </div>

      <div className="card">
        <div className="card-title">{editing ? 'Modifica agente' : 'Nuovo agente'}</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Mesi 1–12: percentuale piena (diversa per esclusiva e non esclusiva). Dal mese 13 in poi: 5% fisso contrattuale.
          Il flag Giorgio qui identifica solo Giorgio come agente normale per modelli non-MD.
        </p>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-3">
            <div className="field">
              <label>Nome agente *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Marco Rossi" />
            </div>
            <div className="field">
              <label>Email accesso</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="agente@example.it"
              />
            </div>
            <div className="field">
              <label>% Esclusiva (mesi 1–12)</label>
              <input type="number" step="0.01" min="0" max="100"
                value={form.commission_pct_exclusive} onChange={e => set('commission_pct_exclusive', e.target.value)} placeholder="10" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="field">
              <label>% Non esclusiva (mesi 1–12)</label>
              <input type="number" step="0.01" min="0" max="100"
                value={form.commission_pct_open} onChange={e => set('commission_pct_open', e.target.value)} placeholder="7" />
            </div>
            <div className="field" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="giorgio-agent-toggle"
              checked={form.is_giorgio_agent}
              onChange={e => set('is_giorgio_agent', e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="giorgio-agent-toggle" style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
              Questo agente rappresenta Giorgio come agente normale su modelli non-MD
            </label>
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
                  <tr><th>Nome</th><th>Email</th><th>% Esclusiva (1–12)</th><th>% Non esclusiva (1–12)</th><th>% dal mese 13</th><th>Invito</th><th></th></tr>
                </thead>
                <tbody>
                  {agents.map(a => (
                    <tr
                      key={a.id}
                      style={editing === a.id
                        ? { background: '#fffbf0' }
                        : a.is_giorgio_agent
                          ? { background: '#f3ecfb' }
                          : {}}
                    >
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{a.email ?? '—'}</td>
                      <td style={{ fontWeight: 600 }}>{a.commission_pct_exclusive ?? a.commission_pct}%</td>
                      <td style={{ fontWeight: 600 }}>{a.commission_pct_open ?? a.commission_pct}%</td>
                      <td style={{ color: 'var(--text-2)' }}>5%</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {a.invited_at
                          ? <span style={{ color: 'var(--text-3)' }}>Invito gia inviato</span>
                          : <button className="btn btn-ghost btn-sm" onClick={() => inviteAgent(a)}>Invita</button>}
                      </td>
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
