const HEX_COLOR = /^#[0-9a-f]{6}$/i

function channels(hex: string): number[] {
  return [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))
}

function luminance(hex: string): number {
  const linear = channels(hex).map((channel) => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function mix(first: string, second: string, amount: number): string {
  const a = channels(first)
  const b = channels(second)
  return `#${a
    .map((channel, index) =>
      Math.round(channel * (1 - amount) + b[index] * amount)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`
}

export function accentTextColor(color: string): '#20242d' | '#ffffff' | '#000000' {
  if (!HEX_COLOR.test(color)) return '#20242d'
  const darkContrast = contrastRatio(color, '#20242d')
  const lightContrast = contrastRatio(color, '#ffffff')
  if (Math.max(darkContrast, lightContrast) < 4.5) return '#000000'
  return darkContrast >= lightContrast ? '#20242d' : '#ffffff'
}

export function accentForegroundColor(color: string, theme: 'dark' | 'light'): string {
  const fallback = theme === 'dark' ? '#ffffff' : '#20242d'
  if (!HEX_COLOR.test(color)) return fallback
  const surfaces = theme === 'dark' ? ['#202020', '#323232', '#1f2026', '#1c1d24'] : ['#ffffff', '#f1f2f5', '#eef0f7']
  const selected = surfaces.map((surface) => mix(surface, color, 0.46))
  for (let step = 0; step <= 100; step++) {
    const candidate = mix(color, fallback, step / 100)
    if (surfaces.every((surface) => contrastRatio(candidate, surface) >= 4.5) && selected.every((surface) => contrastRatio(candidate, surface) >= 3)) {
      return candidate
    }
  }
  return fallback
}
