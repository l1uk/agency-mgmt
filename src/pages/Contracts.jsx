import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Payments from './Payments'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

const empty = {
  model_id: '', client_name: '', reference_amount: '',
  start_date: '', end_date: '', status: 'active', exclusive: 'true'
}

const STATUS_LABELS = {
  active: 'Attivo', expiring: 'In scadenza',
  renewed: 'Rinnovato', expired: 'Scaduto', cancelled: 'Annullato'
}

function renewalBadge(c) {
  const days = Math.ceil((new Date(c.end_date) - new Date()) / 86400000)
  if (c.status === 'expiring' || (c.status === 'active' && days <= 60 && days >= 0)) {
    return days <= 30
      ? <span className="badge" style={{ background: '#fde8e8', color: '#c0392b' }}>⚠ {days}gg alla scadenza</span>
      : <span className="badge" style={{ background: '#fff3cd', color: '#856404' }}>⏰ {days}gg alla scadenza</span>
  }
  return <span className={`badge badge-${c.status}`}>{STATUS_LABELS[c.status] ?? c.status}</span>
}

export default function Contracts() {
  const [contracts, setContracts]   = useState([])
  const [models, setModels]         = useState([])
  const [form, setForm]             = useState(empty)
  const [editing, setEditing]       = useState(null)
  const [expanded, setExpanded]     = useState(null)  // contract id with payments open
  const [msg, setMsg]               = useState(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  async function load() {
    // Also run the expiry updater
    await supabase.rpc('update_expiring_contracts')
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase.from('contracts')
        .select('*, models(first_name, last_name)')
        .order('end_date', { ascending: true }),
      supabase.from('models').select('id, first_name, last_name').order('last_name'),
    ])
    setContracts(c ?? [])
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
    if (!form.start_date)  return 'Inserisci la data di inizio.'
    if (!form.end_date)    return 'Inserisci la data di fine.'
    if (form.end_date <= form.start_date) return 'La data di fine deve essere successiva a quella di inizio.'
    return null
  }

  const startEdit = (c) => {
    setEditing(c.id)
    setForm({
      model_id:         c.model_id,
      client_name:      c.client_name,
      reference_amount: c.reference_amount ? String(c.reference_amount) : '',
      start_date:       c.start_date,
      end_date:         c.end_date,
      status:           c.status,
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
      reference_amount: form.reference_amount ? parseFloat(form.reference_amount) : null,
      start_date:       form.start_date,
      end_date:         form.end_date,
      status:           form.status,
      exclusive:        form.exclusive === 'true',
    }
    const { error } = editing
      ? await supabase.from('contracts').update(payload).eq('id', editing)
      : await supabase.from('contracts').insert(payload)
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', editing ? 'Contratto aggiornato.' : 'Contratto aggiunto.')
    setEditing(null)
    setForm(empty)
    load()
  }

  const renew = async (c) => {
    if (!confirm(`Confermi il rinnovo del contratto con ${c.client_name}? La data di fine verrà estesa di 2 anni.`)) return
    const newEnd = new Date(c.end_date)
    newEnd.setFullYear(newEnd.getFullYear() + 2)
    await supabase.from('contracts').update({
      end_date:   newEnd.toISOString().slice(0, 10),
      status:     'renewed',
      renewed_at: new Date().toISOString(),
    }).eq('id', c.id)
    flash('success', 'Contratto rinnovato. Nuova scadenza: ' + newEnd.toISOString().slice(0, 10))
    load()
  }

  const deleteContract = async (id) => {
    const { data: linked } = await supabase.from('payments').select('id').eq('contract_id', id).limit(1)
    if (linked?.length > 0) {
      flash('error', 'Impossibile eliminare: ci sono incassi registrati su questo contratto.')
      return
    }
    if (!confirm('Eliminare questo contratto?')) return
    await supabase.from('contracts').delete().eq('id', id)
    load()
  }

  const expiringCount = contracts.filter(c =>
    ['expiring'].includes(c.status) ||
    (c.status === 'active' && Math.ceil((new Date(c.end_date) - new Date()) / 86400000) <= 60)
  ).length

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Contratti</h2>
        <p>Gestisci contratti e registra gli incassi per il calcolo automatico delle provvigioni</p>
      </div>

      {expiringCount > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠ {expiringCount} contratt{expiringCount === 1 ? 'o' : 'i'} in scadenza nei prossimi 60 giorni — controlla la lista qui sotto.
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="card-title">{editing ? 'Modifica contratto' : 'Nuovo contratto'}</div>
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
          <div className="form-row-3">
            <div className="field">
              <label>Data inizio *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="field">
              <label>Data fine * (default +2 anni)</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
            <div className="field">
              <label>Importo di riferimento € (opzionale)</label>
              <input type="number" step="0.01" min="0"
                value={form.reference_amount} onChange={e => set('reference_amount', e.target.value)} placeholder="Non usato per calcoli" />
            </div>
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
                <option value="renewed">Rinnovato</option>
                <option value="expired">Scaduto</option>
                <option value="cancelled">Annullato</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : editing ? 'Salva modifiche' : '+ Aggiungi contratto'}
            </button>
            {editing && <button type="button" className="btn btn-ghost" onClick={() => { setEditing(null); setForm(empty) }}>Annulla</button>}
          </div>
        </form>
      </div>

      {/* Contracts list */}
      <div className="card">
        <div className="card-title">Tutti i contratti ({contracts.length})</div>
        {contracts.length === 0
          ? <div className="empty">Nessun contratto ancora registrato.</div>
          : contracts.map(c => (
            <div key={c.id} style={{
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              marginBottom: 12, overflow: 'hidden',
              ...(editing === c.id ? { borderColor: 'var(--accent)' } : {})
            }}>
              {/* Contract header row */}
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
                    {c.start_date} → {c.end_date}
                    {c.exclusive && <span style={{ marginLeft: 8 }}>· Esclusiva</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {renewalBadge(c)}
                  {(c.status === 'expiring' || (c.status === 'active' && Math.ceil((new Date(c.end_date) - new Date()) / 86400000) <= 60)) && (
                    <button className="btn btn-accent btn-sm" onClick={() => renew(c)}>↻ Rinnova</button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  >
                    {expanded === c.id ? '▲ Incassi' : '▼ Incassi'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Modifica</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteContract(c.id)}>✕</button>
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
