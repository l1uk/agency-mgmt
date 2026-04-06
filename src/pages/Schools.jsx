import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const emptySchool = { name: '' }
const emptyRule   = { school_id: '', min_months: '', max_months: '', commission_pct: '' }

export default function Schools() {
  const [schools, setSchools] = useState([])
  const [rules, setRules]     = useState([])
  const [sForm, setSForm]     = useState(emptySchool)
  const [rForm, setRForm]     = useState(emptyRule)
  const [msg, setMsg]         = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('schools').select('id, name').order('name'),
      supabase.from('school_commission_rules').select('*, schools(name)').order('min_months'),
    ])
    setSchools(s ?? [])
    setRules(r ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  const addSchool = async (e) => {
    e.preventDefault()
    if (!sForm.name) return
    const { error } = await supabase.from('schools').insert({ name: sForm.name })
    if (error) { flash('error', error.message); return }
    flash('success', 'Scuola aggiunta.')
    setSForm(emptySchool)
    load()
  }

  const deleteSchool = async (id) => {
    if (!confirm('Eliminare questa scuola? Verranno rimosse anche le sue regole provvigione.')) return
    await supabase.from('school_commission_rules').delete().eq('school_id', id)
    await supabase.from('schools').delete().eq('id', id)
    load()
  }

  const addRule = async (e) => {
    e.preventDefault()
    if (!rForm.school_id || !rForm.min_months || !rForm.commission_pct) {
      flash('error', 'Compila tutti i campi obbligatori della regola.'); return
    }
    if (parseFloat(rForm.commission_pct) <= 0 || parseFloat(rForm.commission_pct) > 100) {
      flash('error', 'La percentuale deve essere tra 0 e 100.'); return
    }
    const { error } = await supabase.from('school_commission_rules').insert({
      school_id:      rForm.school_id,
      min_months:     parseInt(rForm.min_months),
      max_months:     rForm.max_months ? parseInt(rForm.max_months) : null,
      commission_pct: parseFloat(rForm.commission_pct),
    })
    if (error) { flash('error', error.message); return }
    flash('success', 'Regola aggiunta.')
    setRForm(emptyRule)
    load()
  }

  const deleteRule = async (id) => {
    await supabase.from('school_commission_rules').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="loading">Caricamento...</div>

  return (
    <>
      <div className="page-header">
        <h2>Scuole</h2>
        <p>Gestione scuole e relative percentuali di provvigione</p>
      </div>

      {msg && <div className={`alert alert-${msg.type === 'error' ? 'error' : 'success'}`}>{msg.text}</div>}

      {/* Add school */}
      <div className="card">
        <div className="card-title">Nuova scuola</div>
        <form onSubmit={addSchool} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label>Nome scuola *</label>
            <input
              value={sForm.name}
              onChange={e => setSForm({ name: e.target.value })}
              placeholder="Elite Model School"
            />
          </div>
          <button type="submit" className="btn btn-primary">+ Aggiungi</button>
        </form>
      </div>

      {/* Add commission rule */}
      <div className="card">
        <div className="card-title">Nuova regola provvigione</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Definisci la percentuale dovuta alla scuola in base alla durata del contratto in mesi.
          Lascia "mese fine" vuoto per indicare "senza limite".
        </p>
        <form onSubmit={addRule} className="form-grid">
          <div className="form-row-2">
            <div className="field">
              <label>Scuola *</label>
              <select value={rForm.school_id} onChange={e => setRForm(f => ({ ...f, school_id: e.target.value }))}>
                <option value="">— seleziona —</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Percentuale % *</label>
              <input
                type="number" step="0.01" min="0" max="100"
                value={rForm.commission_pct}
                onChange={e => setRForm(f => ({ ...f, commission_pct: e.target.value }))}
                placeholder="8"
              />
            </div>
          </div>
          <div className="form-row-2">
            <div className="field">
              <label>Da mese (incluso) *</label>
              <input
                type="number" min="0"
                value={rForm.min_months}
                onChange={e => setRForm(f => ({ ...f, min_months: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="field">
              <label>A mese (incluso, vuoto = nessun limite)</label>
              <input
                type="number" min="0"
                value={rForm.max_months}
                onChange={e => setRForm(f => ({ ...f, max_months: e.target.value }))}
                placeholder="6"
              />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary">+ Aggiungi regola</button>
          </div>
        </form>
      </div>

      {/* Schools list with their rules */}
      {schools.map(school => {
        const schoolRules = rules
          .filter(r => r.school_id === school.id)
          .sort((a, b) => a.min_months - b.min_months)
        return (
          <div className="card" key={school.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}>{school.name}</div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteSchool(school.id)}>Elimina scuola</button>
            </div>

            {schoolRules.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nessuna regola configurata.</p>
              : (
                <table>
                  <thead>
                    <tr>
                      <th>Da mese</th>
                      <th>A mese</th>
                      <th>Percentuale</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {schoolRules.map(r => (
                      <tr key={r.id}>
                        <td>{r.min_months}</td>
                        <td>{r.max_months ?? '∞'}</td>
                        <td style={{ fontWeight: 600 }}>{r.commission_pct}%</td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteRule(r.id)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
          </div>
        )
      })}

      {schools.length === 0 && (
        <div className="card"><div className="empty">Nessuna scuola ancora registrata.</div></div>
      )}
    </>
  )
}
