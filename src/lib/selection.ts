/** Inclusive range of paths between an anchor and a target, following the displayed order. */
export function selectionRange(paths: string[], anchor: string | null, target: string): string[] {
  const end = paths.indexOf(target)
  if (end < 0) return []
  const start = anchor === null ? -1 : paths.indexOf(anchor)
  if (start < 0) return [target]
  return paths.slice(Math.min(start, end), Math.max(start, end) + 1)
}

/** Keeps the existing selection when the shift-click is additive (Ctrl/Cmd+Shift). */
export function applySelectionRange(current: string[], range: string[], additive: boolean): string[] {
  if (!additive) return range
  return [...new Set([...current, ...range])]
}
