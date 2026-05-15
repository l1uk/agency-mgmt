import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchableSelect from '../components/SearchableSelect'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

function exportCSV(rows) {
  const headers = [
    'Modello','Scuola/Agente','Cliente','Data incasso','Importo',
    'Mese rel.','% MD','€ MD','% Agente','€ Agente','€ Giorgio','Hunt netto'
  ]
  const lines = rows.map(r => [
    r.model_name, r.school_name ?? r.agent_name ?? '—', r.client_name,
    r.paid_at, r.amount, r.rel_month_from_first_payment,
    r.md_pct, r.md_amount, r.agent_pct, r.agent_amount,
    r.giorgio_amount, r.hunt_models_net
  ].join(';'))
  const csv  = [headers.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url
  a.download = `provvigioni_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function Commissions() {
  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState({ model: '', type: '' })

  useEffect(() => {
    supabase.from('payment_commissions').select('*').order('paid_at', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [])

  const filtered = rows.filter(r => {
    if (filter.model && !r.model_name.toLowerCase().includes(filter.model.toLowerCase())) return false
    if (filter.type === 'school' && !r.school_id) return false
    if (filter.type === 'agent'  && !r.agent_id)  return false
    if (filter.type === 'agency' && (r.school_id || r.agent_id)) return false
    return true
  })

  const totals = filtered.reduce((acc, r) => ({
    amount:          acc.amount          + parseFloat(r.amount || 0),
    md_amount:       acc.md_amount       + parseFloat(r.md_amount || 0),
    agent_amount:    acc.agent_amount    + parseFloat(r.agent_amount || 0),
    giorgio_amount:  acc.giorgio_amount  + parseFloat(r.giorgio_amount || 0),
    hunt_models_net: acc.hunt_models_net + parseFloat(r.hunt_models_net || 0),
  }), { amount: 0, md_amount: 0, agent_amount: 0, giorgio_amount: 0, hunt_models_net: 0 })

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Provvigioni</h2>
        <p>Calcolate automaticamente su ogni incasso registrato</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Volume totale</div><div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Quota MD</div><div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.md_amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Quota agenti</div><div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.agent_amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Quota Giorgio</div><div className="stat-value" style={{ fontSize: 19, color: '#7b5ea7' }}>{fmt(totals.giorgio_amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Hunt Models netto</div><div className="stat-value accent" style={{ fontSize: 19 }}>{fmt(totals.hunt_models_net)}</div></div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <input placeholder="Cerca modello..." value={filter.model}
            onChange={e => setFilter(f => ({ ...f, model: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit', flex: 1, minWidth: 160 }} />
          <div style={{ minWidth: 220, flex: 1 }}>
            <SearchableSelect
              label="Tipo"
              value={filter.type}
              onChange={value => setFilter(f => ({ ...f, type: value }))}
              options={[
                { value: 'school', label: 'Solo scuola (MD)' },
                { value: 'agent', label: 'Solo agente' },
                { value: 'agency', label: 'Solo agenzia' },
              ]}
              emptyLabel="Tutti i tipi"
              placeholder="Seleziona tipo"
            />
          </div>
          <button className="btn btn-ghost" onClick={() => exportCSV(filtered)}>↓ Esporta CSV</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Modello</th><th>Partner</th><th>Cliente</th><th>Data</th>
                <th>Incasso</th><th>Mese</th><th>€ MD</th><th>€ Agente</th>
                <th>€ Giorgio</th><th>Hunt netto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={10}><div className="empty">Nessun risultato.</div></td></tr>
                : filtered.map(r => (
                  <tr key={r.payment_id}>
                    <td style={{ fontWeight: 500 }}>{r.model_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                      {r.school_name ?? r.agent_name ?? <span style={{ color: 'var(--text-3)' }}>Solo agenzia</span>}
                    </td>
                    <td>{r.client_name}</td>
                    <td style={{ fontSize: 13 }}>{r.paid_at}</td>
                    <td className="mono">{fmt(r.amount)}</td>
                    <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>{r.rel_month_from_first_payment}</td>
                    <td className="mono" style={{ color: r.md_amount > 0 ? 'var(--navy-light)' : 'var(--text-3)' }}>{fmt(r.md_amount)}</td>
                    <td className="mono" style={{ color: r.agent_amount > 0 ? 'var(--accent-dim)' : 'var(--text-3)' }}>{fmt(r.agent_amount)}</td>
                    <td className="mono" style={{ color: r.giorgio_amount > 0 ? '#7b5ea7' : 'var(--text-3)' }}>{fmt(r.giorgio_amount)}</td>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(r.hunt_models_net)}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
