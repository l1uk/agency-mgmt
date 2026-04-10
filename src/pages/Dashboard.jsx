import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

export default function Dashboard() {
  const [stats, setStats]     = useState(null)
  const [recent, setRecent]   = useState([])
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      await supabase.rpc('update_expiring_contracts')

      const [{ data: payments }, { data: contracts }, { data: expiringContracts }] = await Promise.all([
        supabase.from('payment_commissions').select('contract_id, model_name, amount, hunt_models_net'),
        supabase
          .from('contracts')
          .select('id, client_name, start_date, end_date, status, models(first_name, last_name)')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('contracts_expiring')
          .select('*')
          .order('end_date', { ascending: true })
          .limit(5),
      ])

      const active    = contracts?.filter(r => ['active', 'expiring', 'renewed'].includes(r.status)).length ?? 0
      const volume    = payments?.reduce((s, r) => s + parseFloat(r.amount || 0), 0) ?? 0
      const agency    = payments?.reduce((s, r) => s + parseFloat(r.hunt_models_net || 0), 0) ?? 0
      const models_n  = new Set(payments?.map(r => r.model_name)).size

      setStats({ active, volume, agency, models_n })
      setRecent(contracts ?? [])
      setExpiring(expiringContracts ?? [])
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

      {expiring.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          ⚠ {expiring.length} contratt{expiring.length === 1 ? 'o' : 'i'} in scadenza nei prossimi 60 giorni.
        </div>
      )}

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
                    <th>Periodo</th>
                    <th>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.models?.first_name} {r.models?.last_name}</td>
                      <td>{r.client_name}</td>
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
