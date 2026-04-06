import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: comms }, { data: contracts }] = await Promise.all([
        supabase.from('contract_commissions').select('*'),
        supabase
          .from('contracts')
          .select('*, models(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      const active    = comms?.filter(r => r.status === 'active').length ?? 0
      const volume    = comms?.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0) ?? 0
      const agency    = comms?.reduce((s, r) => s + parseFloat(r.agency_amount || 0), 0) ?? 0
      const models_n  = new Set(comms?.map(r => r.model_name)).size

      setStats({ active, volume, agency, models_n })
      setRecent(contracts ?? [])
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Contratti attivi</div>
          <div className="stat-value">{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Modelli con contratti</div>
          <div className="stat-value">{stats.models_n}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Volume totale</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{fmt(stats.volume)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ricavo agenzia</div>
          <div className="stat-value accent" style={{ fontSize: 20 }}>{fmt(stats.agency)}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Ultimi contratti</div>
        {recent.length === 0
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
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.models?.first_name} {r.models?.last_name}</td>
                      <td>{r.client_name}</td>
                      <td className="mono">{fmt(r.total_amount)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {r.start_date} → {r.end_date}
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
