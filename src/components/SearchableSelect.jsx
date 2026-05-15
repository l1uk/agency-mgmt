import { useEffect, useMemo, useRef, useState } from 'react'

export default function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = '— seleziona —',
  emptyLabel = '— nessuno —',
  searchPlaceholder = 'Cerca...',
  required = false,
  disabled = false,
}) {
  const rootRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => options.find(option => String(option.value) === String(value)) ?? null,
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter(option =>
      String(option.label).toLowerCase().includes(normalized)
    )
  }, [options, query])

  useEffect(() => {
    const onDocClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const handleSelect = (option) => {
    onChange(option.value)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="field" style={{ position: 'relative', marginBottom: 0 }}>
      <label>{label}{required ? ' *' : ''}</label>
      <button
        type="button"
        className="btn"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          justifyContent: 'space-between',
          display: 'flex',
          alignItems: 'center',
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: disabled ? 'var(--surface-2)' : 'white',
          color: selected ? 'var(--text-1)' : 'var(--text-3)',
          fontWeight: 400,
          minHeight: 40,
        }}
      >
        <span style={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? (value ? placeholder : emptyLabel)}
        </span>
        <span style={{ marginLeft: 10, color: 'var(--text-3)' }}>▾</span>
      </button>

      <input type="hidden" value={value ?? ''} />

      {open && !disabled && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {!required && (
              <button
                type="button"
                onClick={() => handleSelect({ value: '', label: emptyLabel })}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: 0,
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {emptyLabel}
              </button>
            )}

            {filteredOptions.length === 0 ? (
              <div style={{ padding: 12, color: 'var(--text-3)', fontSize: 13 }}>Nessun risultato.</div>
            ) : filteredOptions.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  border: 0,
                  background: String(option.value) === String(value) ? 'var(--surface-2)' : 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}