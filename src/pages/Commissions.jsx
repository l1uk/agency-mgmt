import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import SearchableSelect from '../components/SearchableSelect'
import { formatDateShort } from '../lib/format'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

function exportCSV(rows) {
  const headers = [
    'Modello','Scuola/Agente','Cliente','Data','Stato incasso','Importo',
    'Mese rel.','% MD','€ MD','% Agente','€ Agente','€ Giorgio','Hunt netto'
  ]
  const lines = rows.map(r => [
    r.model_name, r.school_name ?? r.agent_name ?? '—', r.client_name,
    r.paid_at ?? r.created_at?.slice(0,10),
    r.paid_at ? 'Incassato' : 'In attesa',
    r.gross_amount ?? r.amount, r.rel_month_from_first_payment,
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
  const [filter, setFilter]   = useState({ model: '', type: '', status: 'all' })

  useEffect(() => {
    supabase.from('payment_commissions')
      .select('*')
      .order('paid_at', { ascending: false, nullsFirst: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [])

  const filtered = rows.filter(r => {
    if (filter.model && !r.model_name.toLowerCase().includes(filter.model.toLowerCase())) return false
    if (filter.type === 'school' && !r.school_id) return false
    if (filter.type === 'agent'  && !r.agent_id)  return false
    if (filter.type === 'agency' && (r.school_id || r.agent_id)) return false
    
    const isPaid = !!r.paid_at || r.payment_status === 'paid'
    if (filter.status === 'paid' && !isPaid) return false
    if (filter.status === 'pending' && isPaid) return false
    return true
  })

  const totals = filtered.reduce((acc, r) => {
    const isPaid = !!r.paid_at || r.payment_status === 'paid'
    const gross = parseFloat(r.gross_amount ?? r.amount ?? 0)
    const md = parseFloat(r.md_amount ?? 0)
    const agent = parseFloat(r.agent_amount ?? 0)
    const giorgio = parseFloat(r.giorgio_amount ?? 0)
    const net = parseFloat(r.hunt_models_net ?? 0)

    acc.amount += gross
    acc.md_amount += md
    acc.agent_amount += agent
    acc.giorgio_amount += giorgio
    acc.hunt_models_net += net

    if (isPaid) {
      acc.paid_net += net
    } else {
      acc.pending_net += net
    }
    return acc
  }, { amount: 0, md_amount: 0, agent_amount: 0, giorgio_amount: 0, hunt_models_net: 0, paid_net: 0, pending_net: 0 })

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Provvigioni</h2>
        <p>Calcolate automaticamente su tutti gli incassi (effettivi e in attesa)</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Volume totale</div><div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Quota MD</div><div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.md_amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Quota agenti</div><div className="stat-value" style={{ fontSize: 19 }}>{fmt(totals.agent_amount)}</div></div>
        <div className="stat-card"><div className="stat-label">Quota Giorgio</div><div className="stat-value" style={{ fontSize: 19, color: '#7b5ea7' }}>{fmt(totals.giorgio_amount)}</div></div>
        <div className="stat-card">
          <div className="stat-label">Hunt netto incassato</div>
          <div className="stat-value accent" style={{ fontSize: 19 }}>{fmt(totals.paid_net)}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Cerca modello..." value={filter.model}
            onChange={e => setFilter(f => ({ ...f, model: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit', flex: 1, minWidth: 160 }} />
          
          <div style={{ minWidth: 180 }}>
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

          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)}>↓ Esporta CSV</button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Modello</th><th>Partner</th><th>Cliente</th><th>Data</th>
                <th>Incasso</th><th>Mese</th><th>€ MD</th><th>€ Agente</th>
                <th>€ Giorgio</th><th>Hunt netto</th><th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={11}><div className="empty">Nessun risultato.</div></td></tr>
                : filtered.map(r => {
                  const isPaid = !!r.paid_at || r.payment_status === 'paid'
                  return (
                    <tr key={r.payment_id} style={!isPaid ? { background: '#fffdf5' } : {}}>
                      <td style={{ fontWeight: 500 }}>{r.model_name}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {r.school_name ?? r.agent_name ?? <span style={{ color: 'var(--text-3)' }}>Solo agenzia</span>}
                      </td>
                      <td>{r.client_name}</td>
                      <td style={{ fontSize: 13 }}>
                        {formatDateShort(r.paid_at ?? r.created_at)}
                      </td>
                      <td className="mono">{fmt(r.gross_amount ?? r.amount)}</td>
                      <td style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>{r.rel_month_from_first_payment ?? 0}</td>
                      <td className="mono" style={{ color: r.md_amount > 0 ? 'var(--navy-light)' : 'var(--text-3)' }}>{fmt(r.md_amount)}</td>
                      <td className="mono" style={{ color: r.agent_amount > 0 ? 'var(--accent-dim)' : 'var(--text-3)' }}>{fmt(r.agent_amount)}</td>
                      <td className="mono" style={{ color: r.giorgio_amount > 0 ? '#7b5ea7' : 'var(--text-3)' }}>{fmt(r.giorgio_amount)}</td>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--success)' }}>{fmt(r.hunt_models_net)}</td>
                      <td>
                        {isPaid
                          ? <span className="badge badge-active">Incassato</span>
                          : <span className="badge badge-expiring">In attesa</span>}
                      </td>
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
