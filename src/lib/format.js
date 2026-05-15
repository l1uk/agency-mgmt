export function formatDateShort(d) {
  if (!d) return '—'
  // accept Date or ISO string
  const date = (d instanceof Date) ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yy = String(date.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

export function formatDateOrEmpty(d) {
  if (!d) return '—'
  return formatDateShort(d)
}

export default formatDateShort

export function parseDateShort(s) {
  if (!s) return null
  // accept dd/mm/yy or dd/mm/yyyy
  const parts = String(s).trim().split(/[\/\-\.]/)
  if (parts.length !== 3) return null
  let [dd, mm, yy] = parts
  if (!dd || !mm || !yy) return null
  dd = dd.padStart(2, '0')
  mm = mm.padStart(2, '0')
  if (yy.length === 2) yy = String(2000 + Number(yy))
  if (yy.length === 4) yy = yy
  const date = new Date(`${yy}-${mm}-${dd}`)
  if (Number.isNaN(date.getTime())) return null
  return `${yy}-${mm}-${dd}`
}
