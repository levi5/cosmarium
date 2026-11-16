import { fileExtension } from '../../constants/files'

const assets = import.meta.glob<string>('../../assets/code-icons/*.svg', {
  eager: true,
  import: 'default',
  query: '?url'
})

const byExtension: Record<string, string> = {
  md: 'markdown',
  markdown: 'markdown',
  mdx: 'markdown',
  txt: 'text',
  log: 'text',
  rst: 'text',
  tex: 'text',
  ini: 'config',
  cfg: 'config',
  conf: 'config',
  config: 'config',
  toml: 'config',
  properties: 'config',
  env: 'environment',
  diff: 'diff',
  patch: 'diff',
  lock: 'lock',
  graphql: 'graphql',
  gql: 'graphql',
  dart: 'dart',
  r: 'r',
  rmd: 'r',
  ipynb: 'jupyter',
  editorconfig: 'config',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  jsx: 'react',
  tsx: 'react',
  py: 'python',
  pyw: 'python',
  rs: 'rust',
  go: 'go',
  html: 'html5',
  htm: 'html5',
  css: 'css3',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  c: 'c',
  h: 'c',
  cpp: 'cplusplus',
  cc: 'cplusplus',
  cxx: 'cplusplus',
  hpp: 'cplusplus',
  hxx: 'cplusplus',
  cs: 'csharp',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  rb: 'ruby',
  php: 'php',
  vue: 'vuejs',
  svelte: 'svelte',
  lua: 'lua',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'azuresqldatabase'
}

export function codeIconFor(name: string): string | undefined {
  const lowerName = name.toLowerCase()
  let icon = byExtension[fileExtension(lowerName)]

  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) icon = 'docker'
  if (['.gitignore', '.gitattributes', '.gitmodules'].includes(lowerName)) icon = 'git'
  if (lowerName === '.env' || lowerName.startsWith('.env.') || lowerName.endsWith('.env')) icon = 'environment'
  if (['.editorconfig', '.npmrc', '.yarnrc', '.babelrc', '.prettierrc', '.eslintrc'].includes(lowerName)) icon = 'config'

  return icon ? assets[`../../assets/code-icons/${icon}.svg`] : undefined
}
