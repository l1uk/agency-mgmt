import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateShort } from '../lib/format'
import DateInput from '../components/DateInput'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function Payments({ contractId, modelName, clientName, firstJobDate, onFirstJobChange }) {
  const [payments, setPayments] = useState([])
  const [commissions, setCommissions] = useState([])
  const [form, setForm] = useState({ gross_amount: '', paid_at: '', hunt_actual_amount: '', notes: '' })
  const [jobDate, setJobDate] = useState(firstJobDate ?? '')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ gross_amount: '', paid_at: '', hunt_actual_amount: '', notes: '' })
  const [agencyHuntPct, setAgencyHuntPct] = useState(0)

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('payments').select('*').eq('contract_id', contractId).order('paid_at'),
      supabase.from('payment_commissions').select('*').eq('job_id', contractId).order('paid_at'),
    ])
    setPayments(p ?? [])
    setCommissions(c ?? [])
  }

  async function loadAgencyPct() {
    const { data: contract } = await supabase
      .from('contracts')
      .select('models(agency_id, agencies(hunt_pct))')
      .eq('id', contractId)
      .single()
    if (contract?.models?.agencies?.hunt_pct !== undefined) {
      setAgencyHuntPct(contract.models.agencies.hunt_pct)
    }
  }

  useEffect(() => { load() }, [contractId])
  useEffect(() => { loadAgencyPct() }, [contractId])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const saveJobDate = async () => {
    const { error } = await supabase.from('jobs')
      .update({ first_job_date: jobDate || null })
      .eq('id', contractId)
    if (error) { flash('error', error.message); return }
    await load()
    flash('success', 'Data primo job salvata.')
    onFirstJobChange?.(jobDate)
  }

  const addPayment = async (e) => {
    e.preventDefault()
    if (!form.gross_amount) { flash('error', 'Inserisci il totale lavoro.'); return }
    setSaving(true)
    // If user left hunt_actual_amount empty but set a paid date, default to theoretical value
    const huntValue = form.paid_at
      ? (form.hunt_actual_amount !== '' && form.hunt_actual_amount != null
          ? parseFloat(form.hunt_actual_amount)
          : parseFloat((parseFloat(form.gross_amount || 0) * parseFloat(agencyPct || 0) / 100).toFixed(2)))
      : null

    const { error } = await supabase.from('payments').insert({
      contract_id: contractId,
      amount:  parseFloat(form.gross_amount),
      paid_at: form.paid_at || null,
      hunt_actual_amount: huntValue,
      notes:   form.notes || null,
    })
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', 'Incasso registrato.')
    setForm({ gross_amount: '', paid_at: '', hunt_actual_amount: '', notes: '' })
    load()
  }

  const deletePayment = async (id) => {
    if (!confirm('Eliminare questo incasso?')) return
    await supabase.from('payments').delete().eq('id', id)
    load()
  }

  const startEdit = (r) => {
    setEditingId(r.payment_id ?? r.id)
    setEditForm({
      gross_amount: r.gross_amount ?? r.amount ?? '',
      paid_at: r.paid_at ?? '',
      hunt_actual_amount: r.hunt_actual_amount ?? '',
      notes: r.payment_notes ?? r.notes ?? ''
    })
  }

  const saveEdit = async (id) => {
    if (!canSaveEdit()) { flash('error', 'Inserisci data e importo valido.'); return }
    setSaving(true)
    // Default hunt_actual_amount to theoretical if left empty when saving an edit
    const editHuntValue = editForm.paid_at
      ? (editForm.hunt_actual_amount !== '' && editForm.hunt_actual_amount != null
          ? parseFloat(editForm.hunt_actual_amount)
          : parseFloat((parseFloat(editForm.gross_amount || 0) * parseFloat(agencyPct || 0) / 100).toFixed(2)))
      : null

    const { error } = await supabase.from('payments').update({
      amount: parseFloat(editForm.gross_amount) || null,
      paid_at: editForm.paid_at || null,
      hunt_actual_amount: editHuntValue,
      notes: editForm.notes || null,
    }).eq('id', id)
    setSaving(false)
    if (error) { flash('error', error.message); return }
    setEditingId(null)
    load()
    flash('success', 'Incasso aggiornato.')
  }

  const canSaveEdit = () => {
    return !!(editForm.paid_at && editForm.gross_amount && parseFloat(editForm.gross_amount) > 0)
  }

  // totals from commissions view
  const totals = commissions.reduce((acc, r) => ({
    amount:           acc.amount           + parseFloat(r.amount || 0),
    md_amount:        acc.md_amount        + parseFloat(r.md_amount || 0),
    agent_amount:     acc.agent_amount     + parseFloat(r.agent_amount || 0),
    giorgio_amount:   acc.giorgio_amount   + parseFloat(r.giorgio_amount || 0),
    hunt_models_net:  acc.hunt_models_net  + parseFloat(r.hunt_models_net || 0),
  }), { amount: 0, md_amount: 0, agent_amount: 0, giorgio_amount: 0, hunt_models_net: 0 })

  const agencyPct = commissions[0]?.agency_hunt_pct ?? agencyHuntPct
  const theoreticalHunt = parseFloat(form.gross_amount || 0) * parseFloat(agencyPct || 0) / 100
  const pendingPaymentsCount = payments.filter(p => !p.paid_at).length

  // Prefill hunt_actual_amount in the form UI when a paid date is set and the field is empty
  useEffect(() => {
    if (form.paid_at) {
      if (form.hunt_actual_amount === '' || form.hunt_actual_amount == null) {
        const defaultVal = (parseFloat(form.gross_amount || 0) * parseFloat(agencyPct || 0) / 100)
        setForm(f => ({ ...f, hunt_actual_amount: defaultVal.toFixed(2) }))
      }
    }
  }, [form.paid_at, form.gross_amount, agencyPct])

  return (
    <div style={{ marginTop: 16 }}>
      {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

      {/* First job date (for agent period) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 20 }}>
          <div className="field" style={{ marginBottom: 0 }}>
          <label>Data primo job confermato (per calcolo periodo agente)</label>
          <DateInput value={jobDate} onChange={v => setJobDate(v)} />
        </div>
        <button className="btn btn-ghost" onClick={saveJobDate}>Salva data</button>
      </div>
      {!jobDate && (
        <div className="alert alert-error">
          La provvigione agente resta a 0 finché non viene salvata la data del primo job confermato.
        </div>
      )}

      <div className="alert alert-success" style={{ marginBottom: 20 }}>
        Percentuale Hunt dell'agenzia: <strong>{agencyPct}%</strong> · importo teorico su questo lavoro: <strong>{fmt(theoreticalHunt)}</strong>
      </div>

      {pendingPaymentsCount > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {pendingPaymentsCount === 1 ? (
            <>C'è 1 incasso pendente per questo contratto. Apri la sezione Incassi Pendenti per registrarlo.</>
          ) : (
            <>Ci sono {pendingPaymentsCount} incassi pendenti per questo contratto. Apri la sezione Incassi Pendenti per registrarli.</>
          )}
        </div>
      )}

      {/* Add payment */}
      <form onSubmit={addPayment} className="form-grid" style={{ marginBottom: 20 }}>
        <div className="form-row-3">
          <div className="field">
            <label>Totale lavoro € *</label>
            <input type="number" step="0.01" min="0"
              value={form.gross_amount} onChange={e => setForm(f => ({ ...f, gross_amount: e.target.value }))}
              placeholder="500" />
          </div>
          <div className="field">
            <label>Data incasso</label>
            <DateInput value={form.paid_at} onChange={v => setForm(f => ({ ...f, paid_at: v }))} />
          </div>
          <div className="field">
            <label>Note</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Opzionale" />
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, marginBottom: 4 }}>
          Nota: se non inserisci la data incasso, l'incasso rimane <strong>pendente</strong> e non viene conteggiato nei totali mostrati nella dashboard. Quando inserisci la data, l'incasso risulterà come effettuato e concorrerà ai totali.
        </div>
        {form.paid_at && (
          <div className="form-row-2">
            <div className="field">
              <label>Incasso effettivo Hunt</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.hunt_actual_amount}
                onChange={e => setForm(f => ({ ...f, hunt_actual_amount: e.target.value }))}
              />
            </div>
            
          </div>
        )}
        <div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? '...' : '+ Registra incasso'}
          </button>
        </div>
      </form>

      {/* Payments + commissions table */}
      {(commissions.length > 0 || pendingPaymentsCount > 0) && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Totale lavoro</th><th>Hunt %</th><th>Hunt teorico</th><th>Hunt effettivo</th><th>Mese rel.</th>
                  <th>MD %</th><th>€ MD</th>
                  <th>Agente %</th><th>€ Agente</th>
                  <th>Giorgio €</th>
                  <th>Hunt netto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {commissions.map(r => (
                  <tr key={r.payment_id}>
                    <td style={{ fontSize: 13 }}>{formatDateShort(r.paid_at)}</td>
                    <td className="mono">{fmt(r.gross_amount ?? r.amount)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>{r.agency_hunt_pct ?? 0}%</td>
                    <td className="mono" style={{ color: 'var(--success)' }}>{fmt(r.hunt_theoretical_amount)}</td>
                    <td className="mono">{fmt(r.hunt_actual_amount)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>{r.rel_month_from_first_payment}</td>
                    <td style={{ color: r.md_amount > 0 ? 'var(--navy-light)' : 'var(--text-3)' }}>{r.md_pct}%</td>
                    <td className="mono">{fmt(r.md_amount)}</td>
                    <td style={{ color: r.agent_amount > 0 ? 'var(--accent-dim)' : 'var(--text-3)' }}>{r.agent_pct}%</td>
                    <td className="mono">{fmt(r.agent_amount)}</td>
                    <td className="mono" style={{ color: r.giorgio_amount > 0 ? '#7b5ea7' : 'var(--text-3)' }}>
                      {fmt(r.giorgio_amount)}
                    </td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(r.hunt_models_net)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePayment(r.payment_id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Pending payments (no paid_at) shown with distinct styling */}
                {payments.filter(p => !p.paid_at).map(p => (
                  <tr key={p.id} style={{ background: '#fff7e6' }}>
                    <td style={{ fontSize: 13 }}>{formatDateShort(p.created_at)}</td>
                    <td className="mono">{fmt(p.amount)}</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>{agencyPct ?? 0}%</td>
                    <td className="mono" style={{ color: 'var(--success)' }}>{fmt((p.amount || 0) * (agencyPct || 0) / 100)}</td>
                    <td className="mono">—</td>
                    <td style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>—</td>
                    <td style={{ color: 'var(--text-3)' }}>—</td>
                    <td className="mono">—</td>
                    <td style={{ color: 'var(--text-3)' }}>—</td>
                    <td className="mono">—</td>
                    <td className="mono">—</td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--text-2)' }}>—</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-danger btn-sm" onClick={() => deletePayment(p.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 600 }}>
                  <td>Totale</td>
                  <td className="mono">{fmt(totals.amount)}</td>
                  <td></td><td></td><td></td><td></td>
                  <td></td><td className="mono">{fmt(totals.md_amount)}</td>
                  <td></td><td className="mono">{fmt(totals.agent_amount)}</td>
                  <td className="mono">{fmt(totals.giorgio_amount)}</td>
                  <td className="mono" style={{ color: 'var(--success)' }}>{fmt(totals.hunt_models_net)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {commissions.length === 0 && payments.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nessun incasso registrato per questo lavoro.</p>
      )}
    </div>
  )
}
