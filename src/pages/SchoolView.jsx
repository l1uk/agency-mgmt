import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const fmt = n => '€' + parseFloat(n || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })

function exportCSV(rows, schoolName) {
  const headers = ['Modello', 'Cliente', 'Importo', 'Durata (mesi)', 'Inizio', 'Fine', 'Stato', '% Scuola', '€ Scuola']
  const lines = rows.map(r => [
    r.model_name, r.client_name, r.total_amount,
    r.duration_months, r.start_date, r.end_date, r.status,
    r.school_pct, r.school_amount,
  ].join(';'))
  const csv  = [headers.join(';'), ...lines].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `provvigioni_${schoolName}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function SchoolView() {
  const { user, signOut }   = useAuth()
  const navigate            = useNavigate()
  const [rows, setRows]     = useState([])
  const [school, setSchool] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ status: '', model: '' })

  useEffect(() => {
    async function load() {
      // school_id is stored in user metadata when account is created
      const schoolId = user?.user_metadata?.school_id
      if (!schoolId) { setLoading(false); return }

      const [{ data: schoolData }, { data: commData }] = await Promise.all([
        supabase.from('schools').select('name').eq('id', schoolId).single(),
        supabase
          .from('contract_commissions')
          .select('*')
          .eq('school_id', schoolId)
          .order('start_date', { ascending: false }),
      ])

      setSchool(schoolData)
      setRows(commData ?? [])
      setLoading(false)
    }
    load()
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const filtered = rows.filter(r => {
    if (filter.status && r.status !== filter.status) return false
    if (filter.model && !r.model_name.toLowerCase().includes(filter.model.toLowerCase())) return false
    return true
  })

  const totVolume = filtered.reduce((s, r) => s + parseFloat(r.total_amount || 0), 0)
  const totSchool = filtered.reduce((s, r) => s + parseFloat(r.school_amount || 0), 0)
  const active    = filtered.filter(r => r.status === 'active').length

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--navy)',
        padding: '16px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>
            {school?.name ?? 'Portale Scuola'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>{user?.email}</div>
        </div>
        <button className="btn-signout" style={{ width: 'auto' }} onClick={handleSignOut}>
          Esci
        </button>
      </div>

      <div style={{ padding: '36px 40px' }}>
        <div className="page-header">
          <h2>I tuoi allievi</h2>
          <p>Contratti e provvigioni dei modelli associati alla tua scuola — sola lettura</p>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Contratti attivi</div>
            <div className="stat-value">{active}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Contratti totali</div>
            <div className="stat-value">{filtered.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Volume generato</div>
            <div className="stat-value" style={{ fontSize: 19 }}>{fmt(totVolume)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Provvigioni scuola</div>
            <div className="stat-value accent" style={{ fontSize: 19 }}>{fmt(totSchool)}</div>
          </div>
        </div>

        <div className="card">
          {/* Filters + export */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <input
              placeholder="Cerca modello..."
              value={filter.model}
              onChange={e => setFilter(f => ({ ...f, model: e.target.value }))}
              style={{
                padding: '7px 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit', flex: 1, minWidth: 160
              }}
            />
            <select
              value={filter.status}
              onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
              style={{
                padding: '7px 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'inherit'
              }}
            >
              <option value="">Tutti gli stati</option>
              <option value="active">Attivo</option>
              <option value="completed">Completato</option>
              <option value="cancelled">Annullato</option>
            </select>
            <button
              className="btn btn-ghost"
              onClick={() => exportCSV(filtered, school?.name ?? 'scuola')}
            >
              ↓ Esporta CSV
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Modello</th>
                  <th>Cliente</th>
                  <th>Importo lordo</th>
                  <th>Durata</th>
                  <th>Periodo</th>
                  <th>% Scuola</th>
                  <th>€ Scuola</th>
                  <th>Stato</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="empty">Nessun contratto trovato.</div>
                      </td>
                    </tr>
                  )
                  : filtered.map(r => (
                    <tr key={r.contract_id}>
                      <td style={{ fontWeight: 500 }}>{r.model_name}</td>
                      <td>{r.client_name}</td>
                      <td className="mono">{fmt(r.total_amount)}</td>
                      <td style={{ textAlign: 'center' }}>{r.duration_months} mesi</td>
                      <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        {r.start_date} → {r.end_date}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--navy-light)' }}>
                        {r.school_pct}%
                      </td>
                      <td className="mono" style={{ fontWeight: 600 }}>
                        {fmt(r.school_amount)}
                      </td>
                      <td>
                        <span className={`badge badge-${r.status}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>

        {rows.length === 0 && !loading && (
          <div className="card">
            <div className="empty">
              Nessun contratto associato a questa scuola ancora registrato.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
