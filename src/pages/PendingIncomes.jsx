import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function PendingIncomes() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ paid_at: '', hunt_actual_amount: '' })
  const [modalError, setModalError] = useState('')

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

  const canSavePending = () => {
    return !!(editForm.paid_at && editForm.hunt_actual_amount && Number(editForm.hunt_actual_amount) > 0)
  }

  const savePending = async () => {
    setModalError('')
    if (!canSavePending()) { setModalError('Inserisci data e importo HUNT valido.'); return }
    setLoading(true)
    const { error } = await supabase.from('payments').update({
      paid_at: editForm.paid_at || null,
      hunt_actual_amount: editForm.paid_at ? (editForm.hunt_actual_amount ? parseFloat(editForm.hunt_actual_amount) : null) : null,
    }).eq('id', editingId)
    setLoading(false)
    if (error) { setModalError(error.message); return }
    setEditingId(null)
    setEditForm({ paid_at: '', hunt_actual_amount: '' })
    const { data } = await supabase.from('pending_incomes').select('*').order('created_at', { ascending: false })
    setRows(data ?? [])
  }

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
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              setModalError('')
                              setEditingId(row.payment_id)
                              setEditForm({
                                paid_at: row.paid_at ?? '',
                                hunt_actual_amount: '',
                              })
                            }}>Segna come incassato / Modifica</button>
                          </div>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
      {/* Modal per dichiarare incasso */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60 }}>
          <div
            onKeyDown={e => { if (e.key === 'Enter') e.preventDefault() }}
            style={{ background: 'white', padding: 20, borderRadius: 8, width: 720, maxWidth: '95%' }}
          >
            <h3>Segna incasso</h3>
            <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>
              Importo lavoro: <strong>{fmt(rows.find(r => r.payment_id === editingId)?.gross_amount)}</strong> ·
              HUNT teorico: <strong>{fmt(rows.find(r => r.payment_id === editingId)?.hunt_theoretical_amount)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div className="field">
                <label>Data incasso *</label>
                <input type="date" value={editForm.paid_at} onChange={e => setEditForm(f => ({ ...f, paid_at: e.target.value }))} />
              </div>
              <div className="field">
                <label>Incasso HUNT € *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.hunt_actual_amount}
                  placeholder={rows.find(r => r.payment_id === editingId)?.hunt_theoretical_amount ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, hunt_actual_amount: e.target.value }))}
                />
              </div>
            </div>
            {modalError && <div className="alert alert-error" style={{ marginTop: 8 }}>{modalError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => { setEditingId(null); setEditForm({ paid_at: '', hunt_actual_amount: '' }) }}>Annulla</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSavePending() || loading}
                onClick={savePending}
              >Salva incasso</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
