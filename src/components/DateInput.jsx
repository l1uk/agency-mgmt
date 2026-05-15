import { useState, useEffect } from 'react'
import { formatDateShort, parseDateShort } from '../lib/format'

export default function DateInput({ value, onChange, id, className, placeholder }) {
  const [text, setText] = useState(value ? formatDateShort(value) : '')

  useEffect(() => {
    setText(value ? formatDateShort(value) : '')
  }, [value])

  const handleBlur = () => {
    const parsed = parseDateShort(text)
    if (parsed) {
      setText(formatDateShort(parsed))
      onChange && onChange(parsed)
    } else {
      // if empty, clear
      if (!text) onChange && onChange(null)
      // otherwise keep text but do not call onChange
    }
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
