export const VIEW_MODES = ['list', 'grid', 'details', 'compact'] as const
export type ViewMode = (typeof VIEW_MODES)[number]
export const DEFAULT_VIEW: ViewMode = 'list'

export const ICON_SIZES = ['small', 'medium', 'large'] as const
export type IconSizeOption = (typeof ICON_SIZES)[number]

export const ICON_PX = {
  small: 16,
  medium: 24,
  large: 36,
  xlarge: 48
} as const
export type FileIconSize = keyof typeof ICON_PX

export const ROW_ANIMATION_STEP_MS = 24
export const ROW_ANIMATION_MAX_INDEX = 10
