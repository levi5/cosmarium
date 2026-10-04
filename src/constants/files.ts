export const IMAGE_EXTENSIONS = ['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp', 'bmp', 'ico'] as const
export const VIDEO_EXTENSIONS = ['m4v', 'mov', 'mp4', 'ogv', 'webm', 'mkv', 'avi'] as const
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'm4a'] as const
export const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz'] as const

export const PREVIEWABLE_EXTENSIONS = ['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webm', 'mp4', 'mov', 'm4v', 'ogv'] as const

export const TEXT_PREVIEWABLE_EXTENSIONS = [
  'txt',
  'md',
  'markdown',
  'log',
  'csv',
  'tsv',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'ini',
  'cfg',
  'conf',
  'env',
  'properties',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'less',
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'tsx',
  'rs',
  'go',
  'py',
  'rb',
  'php',
  'java',
  'kt',
  'swift',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'lua',
  'sql',
  'vue',
  'svelte',
  'svgz',
  'diff',
  'patch',
  'lock',
  'srt',
  'vtt',
  'gitignore',
  'gitattributes',
  'editorconfig',
  'dockerfile',
  'makefile'
] as const

export const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const
export const SIZE_BASE = 1024

export const TAG_COLORS = ['#9b7cff', '#3b9eff', '#ff776b', '#9bdc58', '#e2b34c'] as const
export const TAG_EMOJIS = ['✦', '●', '☻', '⚑', '♥'] as const

export const FOLDER_SIZE_CACHE_LIMIT = 2000

export function fileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : ''
}

export function hasExtension(name: string, extensions: readonly string[]): boolean {
  return extensions.includes(fileExtension(name))
}
