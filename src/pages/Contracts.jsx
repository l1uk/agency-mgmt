import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

const empty = {
  model_id: '', client_name: '', total_amount: '',
  start_date: '', end_date: '', status: 'active', exclusive: false
}

export default function Contracts() {
  const [contracts, setContracts] = useState([])
  const [models, setModels]       = useState([])
  const [form, setForm]           = useState(empty)
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  async function load() {
    const [{ data: c }, { data: m }] = await Promise.all([
      supabase
        .from('contracts')
        .select('*, models(first_name, last_name)')
        .order('created_at', { ascending: false }),
      supabase.from('models').select('id, first_name, last_name').order('last_name'),
    ])
    setContracts(c ?? [])
    setModels(m ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const validate = () => {
    if (!form.model_id)    return 'Seleziona un modello.'
    if (!form.client_name) return 'Inserisci il nome del cliente.'
    if (!form.total_amount || parseFloat(form.total_amount) <= 0) return 'Inserisci un importo valido.'
    if (!form.start_date)  return 'Inserisci la data di inizio.'
    if (!form.end_date)    return 'Inserisci la data di fine.'
    if (form.end_date <= form.start_date) return 'La data di fine deve essere successiva a quella di inizio.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setMsg({ type: 'error', text: err }); return }
    setSaving(true)
    const { error } = await supabase.from('contracts').insert({
      model_id:     form.model_id,
      client_name:  form.client_name,
      total_amount: parseFloat(form.total_amount),
      start_date:   form.start_date,
      end_date:     form.end_date,
      status:       form.status,
      exclusive:    form.exclusive,
    })
    setSaving(false)
    if (error) { setMsg({ type: 'error', text: error.message }); return }
    setMsg({ type: 'success', text: 'Contratto aggiunto.' })
    setForm(empty)
    load()
    setTimeout(() => setMsg(null), 3000)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('contracts').update({ status }).eq('id', id)
    load()
  }

  const deleteContract = async (id) => {
    if (!confirm('Eliminare questo contratto?')) return
    await supabase.from('contracts').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Contratti</h2>
        <p>Registra e gestisci i contratti dei modelli</p>
      </div>

      <div className="card">
        <div className="card-title">Nuovo contratto</div>
        {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-row-2">
            <div className="field">
              <label>Modello *</label>
              <select value={form.model_id} onChange={e => set('model_id', e.target.value)} required>
                <option value="">— seleziona —</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.last_name} {m.first_name}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Cliente *</label>
              <input
                value={form.client_name}
                onChange={e => set('client_name', e.target.value)}
                placeholder="Nome cliente o brand"
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="field">
              <label>Importo lordo € *</label>
              <input
                type="number" step="0.01" min="0"
                value={form.total_amount}
                onChange={e => set('total_amount', e.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="field">
              <label>Data inizio *</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            </div>
            <div className="field">
              <label>Data fine *</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="field">
              <label>Stato</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Attivo</option>
                <option value="completed">Completato</option>
                <option value="cancelled">Annullato</option>
              </select>
            </div>
            <div className="field">
              <label>Tipo inserimento</label>
              <select value={form.exclusive} onChange={e => set('exclusive', e.target.value === 'true')}>
                <option value="true">In esclusiva</option>
                <option value="false">Non in esclusiva</option>
              </select>
            </div>
          </div>

          <div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvataggio...' : '+ Aggiungi contratto'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Tutti i contratti ({contracts.length})</div>
        {contracts.length === 0
          ? <div className="empty">Nessun contratto ancora registrato.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Modello</th>
                    <th>Cliente</th>
                    <th>Importo</th>
                    <th>Periodo</th>
                    <th>Tipo</th>
                    <th>Stato</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>
                        {c.models?.last_name} {c.models?.first_name}
                      </td>
                      <td>{c.client_name}</td>
                      <td className="mono">{fmt(c.total_amount)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {c.start_date} → {c.end_date}
                      </td>
                      <td>
                        <span className={`badge ${c.exclusive ? 'badge-exclusive' : 'badge-open'}`}>
                          {c.exclusive ? 'Esclusiva' : 'Non esclusiva'}
                        </span>
                      </td>
                      <td>
                        <select
                          value={c.status}
                          onChange={e => updateStatus(c.id, e.target.value)}
                          style={{ fontSize: 13, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontFamily: 'inherit', background: 'var(--surface)' }}
                        >
                          <option value="active">Attivo</option>
                          <option value="completed">Completato</option>
                          <option value="cancelled">Annullato</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteContract(c.id)}>✕</button>
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
