import { useState, useEffect } from 'react'
import { supabase, invokeEdgeFunction, getFreshAccessToken } from '../lib/supabase'

const emptySchool = { name: '', email: '', giorgio: false }
const emptyRule   = { school_id: '', min_months: '', max_months: '', commission_pct: '' }

export default function Schools() {
  const [schools, setSchools]     = useState([])
  const [rules, setRules]         = useState([])
  const [sForm, setSForm]         = useState(emptySchool)
  const [rForm, setRForm]         = useState(emptyRule)
  const [editingS, setEditingS]   = useState(null)
  const [msg, setMsg]             = useState(null)
  const [loading, setLoading]     = useState(true)

  async function load() {
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from('schools').select('id, name, email, invited_at, giorgio').order('name'),
      supabase.from('school_commission_rules').select('*').order('min_months'),
    ])
    setSchools(s ?? [])
    setRules(r ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const flash = (type, text) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3500)
  }

  const addSchool = async (e) => {
    e.preventDefault()
    if (!sForm.name) return
    if (sForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sForm.email)) {
      flash('error', 'Inserisci un indirizzo email valido.'); return
    }
    const { error } = await supabase.from('schools').insert({ name: sForm.name, email: sForm.email || null, giorgio: sForm.giorgio })
    if (error) { flash('error', error.message); return }
    flash('success', 'Scuola aggiunta.')
    setSForm(emptySchool)
    load()
  }

  const saveEditSchool = async (e) => {
    e.preventDefault()
    if (!sForm.name) return
    if (sForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sForm.email)) {
      flash('error', 'Inserisci un indirizzo email valido.'); return
    }
    const { error } = await supabase.from('schools').update({ name: sForm.name, email: sForm.email || null, giorgio: sForm.giorgio }).eq('id', editingS)
    if (error) { flash('error', error.message); return }
    flash('success', 'Scuola aggiornata.')
    setEditingS(null)
    setSForm(emptySchool)
    load()
  }

  const deleteSchool = async (id) => {
    // Check for linked models first
    const { data: linked } = await supabase
      .from('models').select('id').eq('school_id', id).limit(1)
    if (linked?.length > 0) {
      flash('error', 'Impossibile eliminare: ci sono modelli associati a questa scuola. Riassegna prima i modelli.')
      return
    }
    if (!confirm('Eliminare questa scuola e tutte le sue regole provvigione?')) return
    await supabase.from('school_commission_rules').delete().eq('school_id', id)
    await supabase.from('schools').delete().eq('id', id)
    load()
  }

  const addRule = async (e) => {
    e.preventDefault()
    if (!rForm.school_id || rForm.min_months === '' || !rForm.commission_pct) {
      flash('error', 'Compila tutti i campi obbligatori.'); return
    }
    const pct = parseFloat(rForm.commission_pct)
    if (pct <= 0 || pct > 100) { flash('error', 'La percentuale deve essere tra 0 e 100.'); return }
    const { error } = await supabase.from('school_commission_rules').insert({
      school_id:      rForm.school_id,
      min_months:     parseInt(rForm.min_months),
      max_months:     rForm.max_months !== '' ? parseInt(rForm.max_months) : null,
      commission_pct: pct,
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

  const inviteSchool = async (school) => {
    if (!school.email) {
      flash('error', "Inserisci prima l'email della scuola, poi salva.")
      return
    }

    let accessToken = null
    try {
      accessToken = await getFreshAccessToken()
    } catch {
      accessToken = null
    }

    if (!accessToken) {
      flash('error', 'Sessione non valida. Esci e rientra prima di inviare l’invito.')
      return
    }

    const { data, error } = await invokeEdgeFunction('invite-school-account', {
      accessToken,
      body: { schoolId: school.id },
    })

    if (error || !data?.ok) {
      flash('error', data?.error ?? error?.message ?? "Invito scuola non riuscito.")
      return
    }

    if (data.mode === 'relinked_existing_user') {
      flash('success', `Account esistente ricollegato a ${school.email}.`)
    } else {
      flash('success', `Invito inviato a ${school.email}.`)
    }
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

      {/* Add / edit school */}
      <div className="card">
        <div className="card-title">{editingS ? 'Modifica scuola' : 'Nuova scuola'}</div>
        <form
          onSubmit={editingS ? saveEditSchool : addSchool}
          className="form-grid"
        >
          <div className="form-row-2">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Nome scuola *</label>
              <input value={sForm.name} onChange={e => setSForm(f => ({ ...f, name: e.target.value }))} placeholder="Elite Model School" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Email accesso</label>
              <input
                type="email"
                value={sForm.email}
                onChange={e => setSForm(f => ({ ...f, email: e.target.value }))}
                placeholder="scuola@example.it"
              />
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <input type="checkbox" id="giorgio-toggle" checked={sForm.giorgio}
              onChange={e => setSForm(f => ({...f, giorgio: e.target.checked}))}
              style={{width:'auto'}} />
            <label htmlFor="giorgio-toggle" style={{margin:0,fontSize:13,color:'var(--text-2)',cursor:'pointer'}}>
              Accordo Giorgio (20% del residuo agenzia)
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn-primary">{editingS ? 'Salva' : '+ Aggiungi'}</button>
            {editingS && (
              <button type="button" className="btn btn-ghost" onClick={() => { setEditingS(null); setSForm(emptySchool) }}>Annulla</button>
            )}
          </div>
        </form>
      </div>

      {/* Add commission rule */}
      <div className="card">
        <div className="card-title">Nuova regola provvigione</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Definisci la % dovuta alla scuola in base alla durata del lavoro in mesi. Lascia "A mese" vuoto per "senza limite".
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
              <input type="number" step="0.01" min="0" max="100"
                value={rForm.commission_pct} onChange={e => setRForm(f => ({ ...f, commission_pct: e.target.value }))} placeholder="8" />
            </div>
          </div>
          <div className="form-row-2">
            <div className="field">
              <label>Da mese (incluso) *</label>
              <input type="number" min="0"
                value={rForm.min_months} onChange={e => setRForm(f => ({ ...f, min_months: e.target.value }))} placeholder="0" />
            </div>
            <div className="field">
              <label>A mese (incluso) — vuoto = nessun limite</label>
              <input type="number" min="0"
                value={rForm.max_months} onChange={e => setRForm(f => ({ ...f, max_months: e.target.value }))} placeholder="6" />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary">+ Aggiungi regola</button>
          </div>
        </form>
      </div>

      {/* Schools list */}
      {schools.map(school => {
        const schoolRules = rules
          .filter(r => r.school_id === school.id)
          .sort((a, b) => a.min_months - b.min_months)
        return (
          <div className="card" key={school.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div className="card-title" style={{ marginBottom: 0 }}>{school.name}</div>
                  {school.giorgio && <span className="badge" style={{background:'#ede7f6',color:'#5e35b1',fontSize:11}}>Giorgio 20%</span>}
                </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setEditingS(school.id)
                  setSForm({ name: school.name, email: school.email ?? '', giorgio: school.giorgio ?? false })
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}>Modifica</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteSchool(school.id)}>Elimina</button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
              Email accesso: {school.email ?? '—'}
              <span style={{ marginLeft: 12 }}>
                {school.invited_at
                  ? 'Invito gia inviato'
                  : <button className="btn btn-ghost btn-sm" onClick={() => inviteSchool(school)}>Invita</button>}
              </span>
            </div>
            {schoolRules.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Nessuna regola configurata.</p>
              : (
                <table>
                  <thead>
                    <tr><th>Da mese</th><th>A mese</th><th>Percentuale</th><th></th></tr>
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
      {schools.length === 0 && <div className="card"><div className="empty">Nessuna scuola ancora registrata.</div></div>}
    </>
  )
}
