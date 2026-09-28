import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDateShort } from '../lib/format'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

function exportCSV(rows, schoolName) {
  const headers = ['Modello','Cliente','Data','Stato incasso','Importo','Mese','% MD','€ MD','€ Giorgio','Stato lavoro']
  const lines = rows.map(r => [
    r.model_name, r.client_name, r.paid_at ?? r.created_at?.slice(0,10),
    r.paid_at ? 'Incassato' : 'In attesa',
    r.gross_amount ?? r.amount,
    r.rel_month_from_first_payment, r.md_pct, r.md_amount,
    r.giorgio_amount, r.contract_status
  ].join(';'))
  const csv  = [headers.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `provvigioni_${schoolName}_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function SchoolView() {
  const { user, signOut }     = useAuth()
  const navigate              = useNavigate()
  const [rows, setRows]       = useState([])
  const [school, setSchool]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState({ model: '', status: 'all' })

  useEffect(() => {
    async function load() {
      const schoolId = user?.user_metadata?.school_id
      if (!schoolId) { setLoading(false); return }
      const [{ data: sd }, { data: cd }] = await Promise.all([
        supabase.from('schools').select('name, giorgio').eq('id', schoolId).single(),
        supabase.from('payment_commissions')
          .select('*').eq('school_id', schoolId)
          .order('paid_at', { ascending: false, nullsFirst: false }),
      ])
      setSchool(sd); setRows(cd ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const filtered = rows.filter(r => {
    if (filter.model && !r.model_name.toLowerCase().includes(filter.model.toLowerCase())) return false
    const isPaid = !!r.paid_at || r.payment_status === 'paid'
    if (filter.status === 'paid' && !isPaid) return false
    if (filter.status === 'pending' && isPaid) return false
    return true
  })

  const totals = filtered.reduce((acc, r) => {
    const isPaid = !!r.paid_at || r.payment_status === 'paid'
    const gross = parseFloat(r.gross_amount ?? r.amount ?? 0)
    const md = parseFloat(r.md_amount ?? 0)
    const giorgio = parseFloat(r.giorgio_amount ?? 0)

    acc.amount += gross
    if (isPaid) {
      acc.md_paid += md
      acc.giorgio_paid += giorgio
    } else {
      acc.md_pending += md
      acc.giorgio_pending += giorgio
    }
    acc.md_total += md
    acc.giorgio_total += giorgio
    return acc
  }, { amount: 0, md_paid: 0, md_pending: 0, md_total: 0, giorgio_paid: 0, giorgio_pending: 0, giorgio_total: 0 })

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--navy)', padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{school?.name ?? 'Portale Scuola'}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{user?.email}</div>
        </div>
        <button className="btn-signout" style={{ width: 'auto' }} onClick={handleSignOut}>Esci</button>
      </div>

      <div style={{ padding: '36px 40px' }}>
        <div className="page-header">
          <h2>I tuoi allievi</h2>
          <p>Incassi e provvigioni dei modelli associati alla tua scuola — sola lettura</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Tua quota incassata (MD)</div>
            <div className="stat-value accent" style={{fontSize:19}}>{fmt(totals.md_paid)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tua quota in attesa</div>
            <div className="stat-value" style={{fontSize:19, color: '#d97706'}}>{fmt(totals.md_pending)}</div>
          </div>
          {school?.giorgio && (
            <div className="stat-card">
              <div className="stat-label">Quota Giorgio (Incassata)</div>
              <div className="stat-value" style={{fontSize:19,color:'#7b5ea7'}}>{fmt(totals.giorgio_paid)}</div>
            </div>
          )}
          <div className="stat-card"><div className="stat-label">Modelli attivi</div><div className="stat-value">{new Set(filtered.map(r => r.model_name)).size}</div></div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Cerca modello..." value={filter.model}
              onChange={e => setFilter(f => ({ ...f, model: e.target.value }))}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit', flex: 1, minWidth: 160 }} />
            
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`btn btn-sm ${filter.status === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f => ({ ...f, status: 'all' }))}
              >
                Tutti
              </button>
              <button
                className={`btn btn-sm ${filter.status === 'paid' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f => ({ ...f, status: 'paid' }))}
              >
                Incassati
              </button>
              <button
                className={`btn btn-sm ${filter.status === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f => ({ ...f, status: 'pending' }))}
              >
                In attesa
              </button>
            </div>

            <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered, school?.name ?? 'scuola')}>↓ Esporta CSV</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Modello</th><th>Cliente</th><th>Data</th>
                  <th>Importo</th><th>Mese</th><th>% MD</th><th>€ MD</th>
                  {school?.giorgio && <th>€ Giorgio</th>}
                  <th>Stato incasso</th>
                  <th>Stato lavoro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={9}><div className="empty">Nessun lavoro trovato.</div></td></tr>
                  : filtered.map(r => {
                    const isPaid = !!r.paid_at || r.payment_status === 'paid'
                    return (
                      <tr key={r.payment_id} style={!isPaid ? { background: '#fffdf5' } : {}}>
                        <td style={{ fontWeight: 500 }}>{r.model_name}</td>
                        <td>{r.client_name}</td>
                        <td style={{ fontSize: 13 }}>
                          {formatDateShort(r.paid_at ?? r.created_at)}
                        </td>
                        <td className="mono">{fmt(r.gross_amount ?? r.amount)}</td>
                        <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>{r.rel_month_from_first_payment ?? 0}</td>
                        <td style={{ fontWeight: 600, color: 'var(--navy-light)' }}>{r.md_pct}%</td>
                        <td className="mono" style={{ fontWeight: 600, color: isPaid ? 'var(--text)' : '#d97706' }}>
                          {fmt(r.md_amount)}
                        </td>
                        {school?.giorgio && <td className="mono" style={{ color: '#7b5ea7' }}>{fmt(r.giorgio_amount)}</td>}
                        <td>
                          {isPaid
                            ? <span className="badge badge-active">Incassato</span>
                            : <span className="badge badge-expiring">In attesa</span>}
                        </td>
                        <td><span className={`badge badge-${r.contract_status}`}>{r.contract_status}</span></td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
