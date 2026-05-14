import { useState, useEffect } from 'react'
import { supabase, invokeEdgeFunction, getFreshAccessToken } from '../lib/supabase'
import Payments from './Payments'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

const empty = {
  model_id: '', client_name: '',
  first_job_date: '', status: 'active', exclusive: 'true'
}

const STATUS_LABELS = {
  active: 'Attivo',
  expired: 'Scaduto', cancelled: 'Annullato'
}

function renewalBadge(c) {
  return <span className={`badge badge-${c.status}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
}

export default function Jobs() {
  const [jobs, setJobs]             = useState([])
  const [models, setModels]         = useState([])
  const [form, setForm]             = useState(empty)
  const [editing, setEditing]       = useState(null)
  const [expanded, setExpanded]     = useState(null)  // job id with payments open
  const [msg, setMsg]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  async function load() {
    const [{ data: j }, { data: m }] = await Promise.all([
      supabase.from('jobs')
        .select('*, models(first_name, last_name)')
        .order('created_at', { ascending: true }),
      supabase.from('models').select('id, first_name, last_name').order('last_name'),
    ])
    setJobs(j ?? [])
    setModels(m ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const validate = () => {
    if (!form.model_id)    return 'Seleziona un modello.'
    if (!form.client_name) return 'Inserisci il nome del cliente.'
    return null
  }

  const startEdit = (c) => {
    setEditing(c.id)
    setForm({
      model_id:         c.model_id,
      client_name:      c.client_name,
      first_job_date:   c.first_job_date ?? '',
      status:           c.status === 'renewed' ? 'active' : c.status,
      exclusive:        String(c.exclusive ?? true),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { flash('error', err); return }
    setSaving(true)
    const payload = {
      model_id:         form.model_id,
      client_name:      form.client_name,
      first_job_date:   form.first_job_date || null,
      status:           form.status,
      exclusive:        form.exclusive === 'true',
    }
    const { error } = editing
      ? await supabase.from('jobs').update(payload).eq('id', editing)
      : await supabase.from('jobs').insert(payload)
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', editing ? 'Lavoro aggiornato.' : 'Lavoro aggiunto.')
    setEditing(null)
    setForm(empty)
    load()
  }

  // Renewal logic removed (no start/end dates)

  const deleteJob = async (id) => {
    const { data: linked } = await supabase.from('payments').select('id').eq('contract_id', id).limit(1)
    if (linked?.length > 0) {
      flash('error', 'Impossibile eliminare: ci sono incassi registrati su questo lavoro.')
      return
    }
    if (!confirm('Eliminare questo lavoro?')) return
    await supabase.from('jobs').delete().eq('id', id)
    load()
  }

  const expiringCount = 0

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Lavori</h2>
        <p>Gestisci i lavori e registra gli incassi per il calcolo automatico delle provvigioni</p>
      </div>

      {expiringCount > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠ {expiringCount} lavor{expiringCount === 1 ? 'o' : 'i'} in scadenza nei prossimi 60 giorni — controlla la lista qui sotto.
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="card-title">{editing ? 'Modifica lavoro' : 'Nuovo lavoro'}</div>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-2">
            <div className="field">
              <label>Modello *</label>
              <select value={form.model_id} onChange={e => set('model_id', e.target.value)} required>
                <option value="">— seleziona —</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.last_name} {m.first_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Cliente *</label>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Vogue Italia" />
            </div>
          </div>
          {/* start_date/end_date removed from form per domain change */}
          <div className="field">
            <label>Data primo job confermato</label>
            <input
              type="date"
              value={form.first_job_date}
              onChange={e => set('first_job_date', e.target.value)}
            />
          </div>
          <div className="form-row-2">
            <div className="field">
              <label>Tipo inserimento</label>
              <select value={form.exclusive} onChange={e => set('exclusive', e.target.value)}>
                <option value="true">In esclusiva</option>
                <option value="false">Non in esclusiva</option>
              </select>
            </div>
            <div className="field">
              <label>Stato</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Attivo</option>
                <option value="expiring">In scadenza</option>
                <option value="expired">Scaduto</option>
                <option value="cancelled">Annullato</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : '+ Aggiungi lavoro'}
            </button>
            {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(empty) }}>Annulla</button>}
          </div>
        </form>
      </div>

      {/* Jobs list */}
      <div className="card">
        <div className="card-title">Tutti i lavori ({jobs.length})</div>
        {jobs.length === 0
          ? <div className="empty">Nessun lavoro ancora registrato.</div>
          : jobs.map(c => (
            <div key={c.id} style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              marginBottom: 12, overflow: 'hidden',
              ...(editing === c.id ? { borderColor: 'var(--accent)' } : {})
            }}>
              {/* Job header row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: 'var(--surface-2)',
                flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {c.models?.last_name} {c.models?.first_name}
                    <span style={{ fontWeight: 400, color: 'var(--text-2)', marginLeft: 8 }}>— {c.client_name}</span>
                  </div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                          {c.first_job_date ?? c.created_at}
                          {c.exclusive && <span style={{ marginLeft: 8 }}>· Esclusiva</span>}
                        </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {renewalBadge(c)}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    {expanded === c.id ? '▲ Incassi' : '▼ Incassi'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Modifica</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteJob(c.id)}>✕</button>
                </div>
              </div>

              {/* Payments panel */}
              {expanded === c.id && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                  <Payments
                    contractId={c.id}
                    modelName={`${c.models?.first_name} ${c.models?.last_name}`}
                    clientName={c.client_name}
                    firstJobDate={c.first_job_date}
                    onFirstJobChange={() => load()}
                  />
                </div>
              )}
            </div>
          ))
        }
      </div>
    </>
  )
}
