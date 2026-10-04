import {
  Add16Regular,
  Archive16Regular,
  ArrowDownload16Regular,
  ArrowLeft16Regular,
  ArrowRight16Regular,
  ArrowSort16Regular,
  ArrowSync16Regular,
  ArrowUpload16Regular,
  Broom16Regular,
  Checkmark16Regular,
  ChevronDown16Regular,
  ChevronRight16Regular,
  ClipboardPaste16Regular,
  Code16Regular,
  Copy16Regular,
  Cut16Regular,
  Delete16Regular,
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
  List16Regular,
  MoreHorizontal16Regular,
  MusicNote216Regular,
  Pin16Regular,
  Rename16Regular,
  Search16Regular,
  Settings16Regular,
  Square16Regular,
  Star16Regular,
  Subtract16Regular,
  Table16Regular,
  Tag16Regular,
  TextBulletListLtr16Regular,
  Video16Regular,
  WeatherMoon16Regular,
  WeatherSunny16Regular
} from '@fluentui/react-icons'
import type { ElementType } from 'react'

type IconName =
  | 'search'
  | 'plus'
  | 'upload'
  | 'folder'
  | 'star'
  | 'clock'
  | 'download'
  | 'file'
  | 'image'
  | 'music'
  | 'trash'
  | 'broom'
  | 'settings'
  | 'chevron'
  | 'chevronDown'
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
  | 'sort'
  | 'menu'
  | 'details'

const icons: Record<IconName, ElementType> = {
  search: Search16Regular,
  plus: Add16Regular,
  upload: ArrowUpload16Regular,
  folder: Folder16Regular,
  star: Star16Regular,
  clock: History16Regular,
  download: ArrowDownload16Regular,
  file: Document16Regular,
  image: Image16Regular,
  music: MusicNote216Regular,
  trash: Delete16Regular,
  broom: Broom16Regular,
  settings: Settings16Regular,
  chevron: ChevronRight16Regular,
  chevronDown: ChevronDown16Regular,
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
  info: Info16Regular,
  archive: Archive16Regular,
  back: ArrowLeft16Regular,
  drive: HardDrive16Regular,
  home: Home16Regular,
  cut: Cut16Regular,
  copy: Copy16Regular,
  paste: ClipboardPaste16Regular,
  rename: Rename16Regular,
  sort: ArrowSort16Regular,
  menu: TextBulletListLtr16Regular,
  details: Table16Regular
}

export function Icon({ name, size = 14 }: { name: IconName; size?: number }) {
  const Glyph = icons[name]
  return <Glyph width={size} height={size} aria-hidden="true" />
}
