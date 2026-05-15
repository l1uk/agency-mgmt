import { useState, useEffect } from 'react'
import { formatDateShort, parseDateShort } from '../lib/format'

export default function DateInput({ value, onChange, id, className, placeholder }) {
  const [text, setText] = useState(value ? formatDateShort(value) : '')
  const [useNative, setUseNative] = useState(false)

  useEffect(() => {
    setText(value ? formatDateShort(value) : '')
  }, [value])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        const mq = window.matchMedia('(pointer: coarse)')
        setUseNative(!!mq.matches)
      } catch (e) {
        setUseNative(false)
      }
    }
  }, [])

  const handleBlur = () => {
    const parsed = parseDateShort(text)
    if (parsed) {
      setText(formatDateShort(parsed))
      onChange && onChange(parsed)
    } else {
      if (!text) onChange && onChange(null)
    }
  }

  if (useNative) {
    return (
      <input id={id} className={className} type="date" value={value || ''} onChange={e => onChange && onChange(e.target.value)} />
    )
  }

  return (
    <input
      id={id}
      className={className}
      type="text"
      placeholder={placeholder || 'gg/mm/aa'}
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={handleBlur}
    />
  )
}
