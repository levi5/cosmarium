import { expect, it } from 'vitest'
import { accentTextColor } from './colors'

it.each(['#9b7cff', '#3b9eff', '#ff776b', '#9bdc58', '#ffffff', '#FFFF00'])('uses dark text for the light accent %s', (color) => {
  expect(accentTextColor(color)).toBe('#20242d')
})

it.each(['#000000', '#101319', '#230048', '#0000AA'])('uses white text for the dark custom accent %s', (color) => {
  expect(accentTextColor(color)).toBe('#ffffff')
})

it.each(['', '#fff', 'invalid', '#gggggg'])('handles invalid accents without producing invalid CSS', (color) => {
  expect(accentTextColor(color)).toBe('#20242d')
})
