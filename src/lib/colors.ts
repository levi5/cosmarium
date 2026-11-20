/** Choose the higher-contrast text color for an opaque six-digit sRGB accent. */
export function accentTextColor(color: string): '#20242d' | '#ffffff' {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return '#20242d'
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((offset) => {
      const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
  }
  const background = luminance(color)
  const dark = luminance('#20242d')
  const darkContrast = (Math.max(background, dark) + 0.05) / (Math.min(background, dark) + 0.05)
  const lightContrast = 1.05 / (background + 0.05)
  return darkContrast >= lightContrast ? '#20242d' : '#ffffff'
}
