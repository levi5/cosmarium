import {
  Add16Regular,
  Archive16Regular,
  ArrowDownload16Regular,
  ArrowLeft16Regular,
  ArrowRight16Regular,
  ArrowSync16Regular,
  ArrowUndo16Regular,
  ArrowUp16Regular,
  Checkmark16Regular,
  ChevronRight16Regular,
  ClipboardPaste16Regular,
  Code16Regular,
  Copy16Regular,
  Cut16Regular,
  Delete16Regular,
  Desktop16Regular,
  Dismiss16Regular,
  Document16Regular,
  Eye16Regular,
  Folder16Regular,
  Grid16Regular,
  HardDrive16Regular,
  History16Regular,
  Home16Regular,
  Image16Regular,
  Info16Regular,
  Keyboard16Regular,
  List16Regular,
  MoreHorizontal16Regular,
  MusicNote216Regular,
  Pin16Regular,
  Rename16Regular,
  Rocket16Regular,
  Search16Regular,
  Settings16Regular,
  ShieldCheckmark16Regular,
  SplitVertical16Regular,
  Square16Regular,
  Star16Regular,
  Subtract16Regular,
  Tag16Regular,
  Video16Regular,
  WeatherMoon16Regular,
  WeatherSunny16Regular,
  WindowNew16Regular
} from '@fluentui/react-icons'
import type { ElementType } from 'react'

export type IconName =
  | 'search'
  | 'plus'
  | 'folder'
  | 'star'
  | 'clock'
  | 'download'
  | 'file'
  | 'image'
  | 'music'
  | 'trash'
  | 'settings'
  | 'chevron'
  | 'grid'
  | 'list'
  | 'more'
  | 'minimize'
  | 'maximize'
  | 'close'
  | 'sun'
  | 'moon'
  | 'check'
  | 'arrow'
  | 'refresh'
  | 'eye'
  | 'pin'
  | 'tag'
  | 'video'
  | 'code'
  | 'archive'
  | 'back'
  | 'drive'
  | 'home'
  | 'info'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'rename'
  | 'up'
  | 'split'
  | 'tabs'
  | 'undo'
  | 'keyboard'
  | 'shield'
  | 'rocket'
  | 'desktop'

const icons: Record<IconName, ElementType> = {
  search: Search16Regular,
  plus: Add16Regular,
  folder: Folder16Regular,
  star: Star16Regular,
  clock: History16Regular,
  download: ArrowDownload16Regular,
  file: Document16Regular,
  image: Image16Regular,
  music: MusicNote216Regular,
  trash: Delete16Regular,
  settings: Settings16Regular,
  chevron: ChevronRight16Regular,
  grid: Grid16Regular,
  list: List16Regular,
  more: MoreHorizontal16Regular,
  minimize: Subtract16Regular,
  maximize: Square16Regular,
  close: Dismiss16Regular,
  sun: WeatherSunny16Regular,
  moon: WeatherMoon16Regular,
  check: Checkmark16Regular,
  arrow: ArrowRight16Regular,
  refresh: ArrowSync16Regular,
  eye: Eye16Regular,
  pin: Pin16Regular,
  tag: Tag16Regular,
  video: Video16Regular,
  code: Code16Regular,
  archive: Archive16Regular,
  back: ArrowLeft16Regular,
  drive: HardDrive16Regular,
  home: Home16Regular,
  info: Info16Regular,
  cut: Cut16Regular,
  copy: Copy16Regular,
  paste: ClipboardPaste16Regular,
  rename: Rename16Regular,
  up: ArrowUp16Regular,
  split: SplitVertical16Regular,
  tabs: WindowNew16Regular,
  undo: ArrowUndo16Regular,
  keyboard: Keyboard16Regular,
  shield: ShieldCheckmark16Regular,
  rocket: Rocket16Regular,
  desktop: Desktop16Regular
}

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const Glyph = icons[name]
  return <Glyph width={size} height={size} aria-hidden="true" />
}
