import { expect, it } from 'vitest'
import { accentForegroundColor, accentTextColor, contrastRatio } from './colors'

it.each(['#9b7cff', '#3b9eff', '#ff776b', '#9bdc58', '#ffffff', '#FFFF00'])('uses dark text for the light accent %s', (color) => {
  expect(accentTextColor(color)).toBe('#20242d')
})

it.each(['#000000', '#101319', '#230048', '#0000AA'])('uses white text for the dark custom accent %s', (color) => {
  expect(accentTextColor(color)).toBe('#ffffff')
})

it.each(['', '#fff', 'invalid', '#gggggg'])('handles invalid accents without producing invalid CSS', (color) => {
  expect(accentTextColor(color)).toBe('#20242d')
})

it.each(['#707070', '#747474', '#777777', '#808080', '#8a6500'])('keeps text readable on mid-tone custom fills such as %s', (color) => {
  expect(contrastRatio(color, accentTextColor(color))).toBeGreaterThanOrEqual(4.5)
})

it.each(['#000000', '#ffffff', '#FFFF00', '#00ff00', '#0000ff', '#ff0000', '#ff00ff', '#9b7cff', '#3b9eff', '#ff776b', '#9bdc58', '#777777'])(
  'keeps accent icons readable on both themes for %s',
  (accent) => {
    for (const theme of ['dark', 'light'] as const) {
      const foreground = accentForegroundColor(accent, theme)
      const surfaces = theme === 'dark' ? ['#202020', '#323232', '#1f2026', '#1c1d24'] : ['#ffffff', '#f1f2f5', '#eef0f7']
      for (const surface of surfaces) {
        expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(4.5)
        for (const opacity of [0.14, 0.24, 0.34, 0.46]) {
          const selected = `#${[1, 3, 5]
            .map((offset) =>
              Math.round(
                Number.parseInt(surface.slice(offset, offset + 2), 16) * (1 - opacity) + Number.parseInt(accent.slice(offset, offset + 2), 16) * opacity
              )
                .toString(16)
                .padStart(2, '0')
            )
            .join('')}`
          expect(contrastRatio(foreground, selected)).toBeGreaterThanOrEqual(3)
        }
      }
    }
  }
)

it('keeps an already legible accent unchanged', () => {
  expect(accentForegroundColor('#000000', 'light')).toBe('#000000')
  expect(accentForegroundColor('#ffffff', 'dark')).toBe('#ffffff')
})

it('provides valid theme-aware fallback foregrounds', () => {
  expect(accentForegroundColor('invalid', 'dark')).toBe('#ffffff')
  expect(accentForegroundColor('invalid', 'light')).toBe('#20242d')
})
