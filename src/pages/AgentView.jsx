import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatDateShort } from '../lib/format'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

function exportCSV(rows, agentName) {
  const headers = ['Modello', 'Cliente', 'Data incasso', 'Importo', 'Mese rel.', '% Agente', '€ Agente']
  const lines = rows.map(r => [
    r.model_name, r.client_name, r.paid_at, r.amount,
    r.rel_month_from_first_payment, r.agent_pct, r.agent_amount
  ].join(';'))
  const csv  = [headers.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `provvigioni_${agentName}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AgentView() {
  const { user, signOut }     = useAuth()
  const navigate              = useNavigate()
  const [rows, setRows]       = useState([])
  const [agentName, setAgentName] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState({ model: '' })

  useEffect(() => {
    async function load() {
      const agentId = user?.user_metadata?.agent_id
      if (!agentId) { setLoading(false); return }

      const [{ data: agentData }, { data: commData }] = await Promise.all([
        supabase.from('agents').select('name').eq('id', agentId).single(),
        supabase.from('payment_commissions')
          .select('*')
          .eq('agent_id', agentId)
          .order('paid_at', { ascending: false }),
      ])
      setAgentName(agentData?.name ?? '')
      setRows(commData ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const filtered = rows.filter(r =>
    !filter.model || r.model_name.toLowerCase().includes(filter.model.toLowerCase())
  )

  const totals = filtered.reduce((acc, r) => ({
    amount:       acc.amount       + parseFloat(r.amount || 0),
    agent_amount: acc.agent_amount + parseFloat(r.agent_amount || 0),
  }), { amount: 0, agent_amount: 0 })

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{
        background: 'var(--navy)', padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Hunt Models — Portale Agente</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{agentName} · {user?.email}</div>
        </div>
        <button className="btn-signout" style={{ width: 'auto' }} onClick={handleSignOut}>Esci</button>
      </div>

      <div style={{ padding: '36px 40px' }}>
        <div className="page-header">
          <h2>Le tue provvigioni</h2>
          <p>Incassi e provvigioni dei modelli che hai introdotto — sola lettura</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Incassi totali (tuoi modelli)</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.amount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Tue provvigioni totali</div>
            <div className="stat-value accent" style={{ fontSize: 19 }}>{fmt(totals.agent_amount)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Modelli attivi</div>
            <div className="stat-value">{new Set(filtered.map(r => r.model_name)).size}</div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <input placeholder="Cerca modello..." value={filter.model}
              onChange={e => setFilter(f => ({ ...f, model: e.target.value }))}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit', flex: 1, minWidth: 160 }} />
            <button className="btn btn-ghost" onClick={() => exportCSV(filtered, agentName)}>↓ Esporta CSV</button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Modello</th><th>Cliente</th><th>Data incasso</th>
                  <th>Importo</th><th>Mese</th><th>% Agente</th><th>€ Agente</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? <tr><td colSpan={7}><div className="empty">Nessun incasso trovato.</div></td></tr>
                  : filtered.map(r => (
                    <tr key={r.payment_id}>
                      <td style={{ fontWeight: 500 }}>{r.model_name}</td>
                      <td>{r.client_name}</td>
                      <td style={{ fontSize: 13 }}>{formatDateShort(r.paid_at)}</td>
                      <td className="mono">{fmt(r.amount)}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>{r.rel_month_from_first_payment}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-dim)' }}>{r.agent_pct}%</td>
                      <td className="mono" style={{ fontWeight: 600 }}>{fmt(r.agent_amount)}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
