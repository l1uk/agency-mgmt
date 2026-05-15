import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateShort } from '../lib/format'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: payments }, { data: pendingPayments }, { data: jobs }] = await Promise.all([
        supabase.from('payment_commissions').select('job_id, model_name, gross_amount, hunt_models_net'),
        supabase.from('payments').select('amount').is('paid_at', null),
        supabase
          .from('jobs')
          .select('id, client_name, status, first_job_date, models(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      const active    = jobs?.filter(r => ['active', 'expiring', 'renewed'].includes(r.status)).length ?? 0
      const volume    = payments?.reduce((s, r) => s + parseFloat(r.gross_amount || r.amount || 0), 0) ?? 0
      const agency    = payments?.reduce((s, r) => s + parseFloat(r.hunt_models_net || 0), 0) ?? 0
      const models_n  = new Set(payments?.map(r => r.model_name)).size
      const pending   = pendingPayments?.reduce((s, r) => s + parseFloat(r.amount || 0), 0) ?? 0
      const pending_n = pendingPayments?.length ?? 0

      setStats({ active, volume, agency, models_n, pending, pending_n })
      setRecent(jobs ?? [])
      setExpiring([])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Panoramica generale dell'agenzia</p>
      </div>

      {/* Expiry warnings removed; start/end dates deprecated */}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Lavori attivi</div>
          <div className="stat-value">{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Modelli con lavori</div>
          <div className="stat-value">{stats.models_n}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Volume totale</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(stats.volume)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Incasso HUNT</div>
          <div className="stat-value accent" style={{ fontSize: 20 }}>{fmt(stats.agency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Incassi pendenti</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{stats.pending_n}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{fmt(stats.pending)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Ultimi lavori</div>
        {recent.length === 0
          ? <div className="empty">Nessun lavoro ancora registrato.</div>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Modello</th>
                    <th>Cliente</th>
                    <th>Primo job</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.models?.first_name} {r.models?.last_name}</td>
                      <td>{r.client_name}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {formatDateShort(r.first_job_date ?? r.created_at)}
                      </td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
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
