import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function Payments({ contractId, modelName, clientName, firstJobDate, onFirstJobChange }) {
  const [payments, setPayments] = useState([])
  const [commissions, setCommissions] = useState([])
  const [form, setForm] = useState({ amount: '', paid_at: '', notes: '' })
  const [jobDate, setJobDate] = useState(firstJobDate ?? '')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('payments').select('*').eq('contract_id', contractId).order('paid_at'),
      supabase.from('payment_commissions').select('*').eq('contract_id', contractId).order('paid_at'),
    ])
    setPayments(p ?? [])
    setCommissions(c ?? [])
  }

  useEffect(() => { load() }, [contractId])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const saveJobDate = async () => {
    const { error } = await supabase.from('contracts')
      .update({ first_job_date: jobDate || null })
      .eq('id', contractId)
    if (error) { flash('error', error.message); return }
    flash('success', 'Data primo job salvata.')
    onFirstJobChange?.(jobDate)
  }

  const addPayment = async (e) => {
    e.preventDefault()
    if (!form.amount || !form.paid_at) { flash('error', 'Importo e data sono obbligatori.'); return }
    setSaving(true)
    const { error } = await supabase.from('payments').insert({
      contract_id: contractId,
      amount:  parseFloat(form.amount),
      paid_at: form.paid_at,
      notes:   form.notes || null,
    })
    setSaving(false)
    if (error) { flash('error', error.message); return }
    flash('success', 'Incasso registrato.')
    setForm({ amount: '', paid_at: '', notes: '' })
    load()
  }

  const deletePayment = async (id) => {
    if (!confirm('Eliminare questo incasso?')) return
    await supabase.from('payments').delete().eq('id', id)
    load()
  }

  // totals from commissions view
  const totals = commissions.reduce((acc, r) => ({
    amount:           acc.amount           + parseFloat(r.amount || 0),
    md_amount:        acc.md_amount        + parseFloat(r.md_amount || 0),
    agent_amount:     acc.agent_amount     + parseFloat(r.agent_amount || 0),
    giorgio_amount:   acc.giorgio_amount   + parseFloat(r.giorgio_amount || 0),
    hunt_models_net:  acc.hunt_models_net  + parseFloat(r.hunt_models_net || 0),
  }), { amount: 0, md_amount: 0, agent_amount: 0, giorgio_amount: 0, hunt_models_net: 0 })

  return (
    <div style={{ marginTop: 16 }}>
      {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

      {/* First job date (for agent period) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 20 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Data primo job confermato (per calcolo periodo agente)</label>
          <input type="date" value={jobDate} onChange={e => setJobDate(e.target.value)} />
        </div>
        <button className="btn btn-ghost" onClick={saveJobDate}>Salva data</button>
      </div>

      {/* Add payment */}
      <form onSubmit={addPayment} className="form-grid" style={{ marginBottom: 20 }}>
        <div className="form-row-3">
          <div className="field">
            <label>Importo incasso € *</label>
            <input type="number" step="0.01" min="0"
              value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="500" />
          </div>
          <div className="field">
            <label>Data incasso *</label>
            <input type="date" value={form.paid_at}
              onChange={e => setForm(f => ({ ...f, paid_at: e.target.value }))} />
          </div>
          <div className="field">
            <label>Note</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Opzionale" />
          </div>
        </div>
        <div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? '...' : '+ Registra incasso'}
          </button>
        </div>
      </form>

      {/* Payments + commissions table */}
      {commissions.length > 0 && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th><th>Incasso</th><th>Mese rel.</th>
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
                    <td style={{ fontSize: 13 }}>{r.paid_at}</td>
                    <td className="mono">{fmt(r.amount)}</td>
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
                      <button className="btn btn-danger btn-sm" onClick={() => deletePayment(r.payment_id)}>✕</button>
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ background: 'var(--surface-2)', fontWeight: 600 }}>
                  <td>Totale</td>
                  <td className="mono">{fmt(totals.amount)}</td>
                  <td></td>
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
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nessun incasso registrato per questo contratto.</p>
      )}
    </div>
  )
}
