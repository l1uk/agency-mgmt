import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

function exportCSV(rows) {
  const headers = [
    'Modello','Scuola','Agente','Cliente','Importo',
    'Durata (mesi)','Inizio','Fine','Stato',
    'Scuola %','€ Scuola','Agente %','€ Agente','Agenzia %','€ Agenzia'
  ]
  const lines = rows.map(r => [
    r.model_name, r.school_name ?? '', r.agent_name ?? '',
    r.client_name, r.total_amount,
    r.duration_months, r.start_date, r.end_date, r.status,
    r.school_pct, r.school_amount,
    r.agent_pct, r.agent_amount,
    r.agency_pct, r.agency_amount,
  ].join(';'))

  const csv  = [headers.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `provvigioni_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Commissions() {
  const [rows, setRows]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState({ status: '', model: '' })

  useEffect(() => {
    supabase
      .from('contract_commissions')
      .select('*')
      .order('start_date', { ascending: false })
      .then(({ data }) => { setRows(data ?? []); setLoading(false) })
  }, [])

  const filtered = rows.filter(r => {
    if (filter.status && r.status !== filter.status) return false
    if (filter.model  && !r.model_name.toLowerCase().includes(filter.model.toLowerCase())) return false
    return true
  })

  const totVolume = filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const totAgency = filtered.reduce((s, r) => s + parseFloat(r.agency_amount || 0), 0)
  const totSchool = filtered.reduce((s, r) => s + parseFloat(r.school_amount || 0), 0)
  const totAgent  = filtered.reduce((s, r) => s + parseFloat(r.agent_amount  || 0), 0)

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Provvigioni</h2>
        <p>Calcolo automatico per ogni contratto</p>
      </div>

      {/* Totals */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Volume filtrato</div>
          <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totVolume)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Totale agenzia</div>
          <div className="stat-value accent" style={{ fontSize: 19 }}>{fmt(totAgency)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Totale scuola</div>
          <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totSchool)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Totale agenti</div>
          <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totAgent)}</div>
        </div>
      </div>

      <div className="card">
        {/* Filters + export */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <input
            placeholder="Cerca modello..."
            value={filter.model}
            onChange={e => setFilter(f => ({ ...f, model: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit', flex: 1, minWidth: 160 }}
          />
          <select
            value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit' }}
          >
            <option value="">Tutti gli stati</option>
            <option value="active">Attivo</option>
            <option value="completed">Completato</option>
            <option value="cancelled">Annullato</option>
          </select>
          <button className="btn btn-ghost" onClick={() => exportCSV(filtered)}>
            ↓ Esporta CSV
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: 12, color: 'var(--text-2)' }}>
          <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#2d6a9f', marginRight:4 }}></span>Scuola</span>
          <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'var(--accent)', marginRight:4 }}></span>Agente</span>
          <span><span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:'#27ae60', marginRight:4 }}></span>Agenzia</span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Modello</th>
                <th>Cliente</th>
                <th>Importo</th>
                <th>Mesi</th>
                <th>Scuola</th>
                <th>Agente</th>
                <th>Agenzia</th>
                <th>Split</th>
                <th>Stato</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9}><div className="empty">Nessun risultato.</div></td></tr>
                : filtered.map(r => {
                  const tot = parseFloat(r.school_pct) + parseFloat(r.agent_pct) + parseFloat(r.agency_pct)
                  const sp  = tot > 0 ? (r.school_pct / tot * 100).toFixed(0) : 0
                  const ap  = tot > 0 ? (r.agent_pct  / tot * 100).toFixed(0) : 0
                  const agp = tot > 0 ? (r.agency_pct / tot * 100).toFixed(0) : 0
                  return (
                    <tr key={r.contract_id}>
                      <td style={{ fontWeight: 500 }}>{r.model_name}</td>
                      <td>{r.client_name}</td>
                      <td className="mono">{fmt(r.total_amount)}</td>
                      <td style={{ textAlign: 'center' }}>{r.duration_months}</td>
                      <td>
                        <div className="mono">{fmt(r.school_amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.school_pct}%</div>
                      </td>
                      <td>
                        <div className="mono">{fmt(r.agent_amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.agent_pct}%</div>
                      </td>
                      <td>
                        <div className="mono">{fmt(r.agency_amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.agency_pct}%</div>
                      </td>
                      <td>
                        <div className="pct-bar">
                          <div className="pct-school" style={{ width: sp + '%' }} />
                          <div className="pct-agent"  style={{ width: ap + '%' }} />
                          <div className="pct-agency" style={{ width: agp + '%' }} />
                        </div>
                      </td>
                      <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
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
