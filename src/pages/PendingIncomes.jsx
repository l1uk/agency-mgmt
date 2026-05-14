import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function PendingIncomes() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ gross_amount: '', paid_at: '', hunt_actual_amount: '', notes: '' })

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('pending_incomes')
        .select('*')
        .order('created_at', { ascending: false })

      setRows(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totals = rows.reduce((acc, row) => ({
    gross: acc.gross + parseFloat(row.gross_amount || 0),
    hunt: acc.hunt + parseFloat(row.hunt_theoretical_amount || 0),
  }), { gross: 0, hunt: 0 })

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Incassi pendenti</h2>
        <p>Registrazioni senza data incasso, tenute separate dalle provvigioni già contabilizzate</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Totale pendente</div>
          <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.gross)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Hunt teorico pendente</div>
          <div className="stat-value accent" style={{ fontSize: 19 }}>{fmt(totals.hunt)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Righe pendenti</div>
          <div className="stat-value">{rows.length}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Elenco pendenti</div>
        {rows.length === 0
          ? <div className="empty">Nessun incasso pendente.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Modello</th><th>Cliente</th><th>Agenzia</th><th>Totale lavoro</th><th>% Hunt</th><th>Hunt teorico</th><th>Giorni</th><th>Note</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                      <tr key={row.payment_id}>
                        <td style={{ fontWeight: 500 }}>{row.model_name}</td>
                        <td>{row.client_name}</td>
                        <td>{row.agency_name ?? <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                        <td className="mono">{fmt(row.gross_amount)}</td>
                        <td style={{ textAlign: 'center' }}>{row.agency_hunt_pct ?? 0}%</td>
                        <td className="mono" style={{ color: 'var(--success)' }}>{fmt(row.hunt_theoretical_amount)}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-2)' }}>{row.days_pending}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{row.payment_notes ?? '—'}</td>
                        <td style={{ width: 220 }}>
                          {editingId === row.payment_id ? (
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <input type="date" value={editForm.paid_at} onChange={e => setEditForm(f => ({ ...f, paid_at: e.target.value }))} />
                              <input type="number" step="0.01" min="0" style={{ width: 120 }} value={editForm.gross_amount} onChange={e => setEditForm(f => ({ ...f, gross_amount: e.target.value }))} />
                              <button className="btn btn-primary btn-sm" onClick={async () => {
                                setLoading(true)
                                const { error } = await supabase.from('payments').update({
                                  amount: parseFloat(editForm.gross_amount) || null,
                                  paid_at: editForm.paid_at || null,
                                  hunt_actual_amount: editForm.paid_at ? (editForm.hunt_actual_amount ? parseFloat(editForm.hunt_actual_amount) : null) : null,
                                  notes: editForm.notes || null,
                                }).eq('id', row.payment_id)
                                setLoading(false)
                                if (error) return alert(error.message)
                                setEditingId(null)
                                setEditForm({ gross_amount: '', paid_at: '', hunt_actual_amount: '', notes: '' })
                                const { data } = await supabase.from('pending_incomes').select('*').order('created_at', { ascending: false })
                                setRows(data ?? [])
                              }}>Salva</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(null); setEditForm({ gross_amount: '', paid_at: '', hunt_actual_amount: '', notes: '' }) }}>Annulla</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-ghost btn-sm" onClick={() => {
                                setEditingId(row.payment_id)
                                setEditForm({
                                  gross_amount: row.gross_amount ?? '',
                                  paid_at: row.paid_at ?? '',
                                  hunt_actual_amount: row.hunt_actual_amount ?? '',
                                  notes: row.payment_notes ?? '',
                                })
                              }}>Segna come incassato / Modifica</button>
                            </div>
                          )}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  )
}
