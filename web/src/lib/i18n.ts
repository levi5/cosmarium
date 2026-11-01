import type { Language } from './preferences'

type PreviewRow = {
  name: string
  modified: string
  size: string
  kind: 'file' | 'directory'
  selected: boolean
}

const pt = {
  title: 'Cosmarium — gerenciador de arquivos para desktop',
  description:
    'Cosmarium é um gerenciador de arquivos nativo para Windows e Linux. Abas, painéis duplos, busca com filtros, pré-visualização e transferências sob controle.',
  nav: {
    features: 'Recursos',
    shortcuts: 'Atalhos',
    stack: 'Stack',
    download: 'Baixar'
  },
  header: {
    github: 'Abrir o repositório no GitHub',
    navLabel: 'Navegação principal',
    themeToDark: 'Usar tema escuro',
    themeToLight: 'Usar tema claro',
    language: 'Idioma',
    skip: 'Pular para o conteúdo'
  },
  hero: {
    badge: 'Código aberto · MIT',
    title: 'Seus arquivos,',
    titleAccent: 'no seu ritmo.',
    description:
      'Cosmarium junta a velocidade de um app nativo com a fluidez de uma interface feita para trabalhar. Navegue, transfira, organize e encontre tudo sem sair do fluxo.',
    primary: 'Baixar para desktop',
    secondary: 'Ver no GitHub',
    meta: ['Windows', 'Linux', 'Tauri + Rust', 'Licença MIT'],
    previewAlt:
      'Prévia da interface do Cosmarium: abas, barra lateral de acesso rápido, lista de arquivos e painel de detalhes.'
  },
  preview: {
    tabs: ['Início', 'Projetos'],
    path: 'C:\\Users\\levi\\Projetos',
    quickGroup: 'Acesso rápido',
    favoriteGroup: 'Favoritos',
    quick: {
      home: 'Início',
      documents: 'Documentos',
      downloads: 'Downloads',
      pictures: 'Imagens',
      music: 'Músicas',
      videos: 'Vídeos',
      trash: 'Lixeira'
    },
    favorites: {
      cosmarium: 'cosmarium',
      brand: 'Identidade visual'
    },
    title: 'Projetos',
    newFolder: 'Nova pasta',
    table: {
      name: 'Nome',
      modified: 'Modificado',
      size: 'Tamanho'
    },
    rows: [
      { name: 'cosmarium', modified: 'Hoje, 14:32', size: '—', kind: 'directory', selected: false },
      { name: 'site-institucional', modified: 'Ontem, 18:04', size: '—', kind: 'directory', selected: false },
      { name: 'capturas', modified: '12 out, 09:21', size: '—', kind: 'directory', selected: false },
      { name: 'notas.md', modified: 'Hoje, 11:08', size: '4 KB', kind: 'file', selected: false },
      { name: 'proposta.pdf', modified: '28 out, 15:42', size: '1,8 MB', kind: 'file', selected: true },
      { name: 'capa.png', modified: '25 out, 17:10', size: '2,4 MB', kind: 'file', selected: false },
      { name: 'trilha.mp3', modified: '20 out, 20:15', size: '6,1 MB', kind: 'file', selected: false }
    ] as PreviewRow[],
    detailsTitle: 'Detalhes',
    detailsName: 'proposta.pdf',
    tagsLabel: 'Tags',
    tags: ['Cliente', 'Urgente'],
    sizeLabel: 'Tamanho',
    sizeValue: '1,8 MB',
    modifiedLabel: 'Modificado',
    modifiedValue: '28 out 2026, 15:42',
    status: '7 itens',
    statusSelected: '1 selecionado',
    transferTitle: 'Transferindo 3 arquivos',
    transferMeta: '68% · 24 MB/s',
    transferEta: 'Restam 12 s'
  },
  features: {
    eyebrow: 'Recursos',
    title: 'Tudo o que um explorador deveria ser.',
    description:
      'Sem plugins, sem janelas perdidas, sem espera. O essencial existe, funciona junto e foi pensado para quem usa o computador o dia inteiro.',
    items: [
      {
        title: 'Abas e painéis duplos',
        text: 'Compare pastas lado a lado, arraste entre painéis e mantenha várias abas abertas como no navegador.'
      },
      {
        title: 'Atualização ao vivo',
        text: 'O app observa o disco e atualiza a lista na hora. Nada de F5, nada de conteúdo desatualizado.'
      },
      {
        title: 'Transferências sob controle',
        text: 'Copie e mova com progresso, velocidade, tempo restante, pausa, retomada e cancelamento.'
      },
      {
        title: 'Desfazer de verdade',
        text: 'Excluir, mover, renomear. Se algo sair do lugar, Ctrl+Z devolve tudo como estava.'
      },
      {
        title: 'Pré-visualização rica',
        text: 'Imagens, PDFs, texto, áudio e vídeo aparecem no painel de detalhes, sem abrir outro programa.'
      },
      {
        title: 'ZIP e renomeação em lote',
        text: 'Compacte e extraia com segurança. Renomeie dezenas de arquivos com prefixo, numeração e prévia.'
      },
      {
        title: 'Busca com filtros',
        text: 'Encontre por nome, extensão, tamanho, data ou conteúdo — inclusive dentro de subpastas.'
      },
      {
        title: 'Tags e acesso rápido',
        text: 'Marque arquivos com cores, fixe pastas e crie atalhos para o que você abre todo dia.'
      },
      {
        title: 'Feito para o teclado',
        text: 'Atalhos para tudo, navegação por linha e diálogos acessíveis. O mouse é opcional.'
      }
    ]
  },
  shortcuts: {
    eyebrow: 'Atalhos',
    title: 'Na velocidade dos seus dedos.',
    description:
      'Os mesmos comandos que você já conhece, com espaço para personalizar cada combinação em Configurações › Atalhos.',
    items: [
      { keys: ['Ctrl', 'T'], label: 'Nova aba' },
      { keys: ['Ctrl', 'Shift', 'N'], label: 'Nova pasta' },
      { keys: ['F2'], label: 'Renomear' },
      { keys: ['Espaço'], label: 'Pré-visualizar' },
      { keys: ['Ctrl', 'E'], label: 'Painel de detalhes' },
      { keys: ['Ctrl', 'F'], label: 'Pesquisar' },
      { keys: ['Ctrl', 'Z'], label: 'Desfazer' },
      { keys: ['F1'], label: 'Ver todos os atalhos' }
    ],
    note: 'Combinações padrão. Todas podem ser alteradas.'
  },
  stack: {
    eyebrow: 'Aberto por dentro',
    title: 'Nativo de verdade. Leve por escolha.',
    description:
      'A interface roda em React. Quem conversa com o disco é o Rust. O resultado é um app rápido, com pouca memória e sem carregar um navegador inteiro junto.',
    code: {
      file: 'stack.json',
      lines: [
        { key: 'shell', value: 'tauri 2 · rust' },
        { key: 'interface', value: 'react 18 · typescript' },
        { key: 'state', value: 'zustand' },
        { key: 'build', value: 'vite' },
        { key: 'license', value: 'MIT' }
      ]
    },
    tech: [
      { name: 'Tauri 2', role: 'Shell nativo' },
      { name: 'Rust', role: 'Backend de arquivos' },
      { name: 'React 18', role: 'Interface' },
      { name: 'TypeScript', role: 'Tipos de ponta a ponta' }
    ],
    principles: [
      {
        title: 'Privado por padrão',
        text: 'Sem telemetria e sem conta. Seus arquivos não saem da sua máquina.'
      },
      {
        title: 'Aberto de ponta a ponta',
        text: 'Licença MIT no backend, no frontend e neste site.'
      },
      {
        title: 'Leve por design',
        text: 'Webview nativa do sistema em vez de um Chromium embutido.'
      }
    ]
  },
  download: {
    eyebrow: 'Comece agora',
    title: 'Coloque seus arquivos em ordem.',
    description:
      'Os pacotes para Windows e Linux são publicados no GitHub Releases. Prefere compilar? O projeto usa pnpm e Rust stable.',
    primary: 'Ver releases',
    secondary: 'Ler o README',
    platforms: [
      { name: 'Windows', detail: 'Instalador nativo' },
      { name: 'Linux', detail: 'Pacotes do sistema' },
      { name: 'Código-fonte', detail: 'Rust + pnpm' }
    ],
    cloneLabel: 'Compilar a partir do código-fonte',
    copy: 'Copiar comando',
    copied: 'Copiado!',
    requirement: 'Requer Node.js 24+, pnpm 10+ e Rust stable.'
  },
  footer: {
    tagline: 'Gerenciador de arquivos para Windows e Linux, feito com Tauri, Rust e React.',
    product: 'Produto',
    resources: 'Recursos',
    project: 'Projeto',
    releases: 'Releases',
    readme: 'README',
    issues: 'Issues',
    license: 'Licença MIT',
    source: 'Código-fonte',
    madeBy: 'Feito por levi5',
    backToTop: 'Voltar ao topo',
    copyright: '© 2026 Cosmarium. Código aberto sob a licença MIT.'
  }
}

const en: typeof pt = {
  title: 'Cosmarium — a desktop file manager',
  description:
    'Cosmarium is a native file manager for Windows and Linux. Tabs, dual panes, filtered search, previews and transfers you control.',
  nav: {
    features: 'Features',
    shortcuts: 'Shortcuts',
    stack: 'Stack',
    download: 'Download'
  },
  header: {
    github: 'Open the GitHub repository',
    navLabel: 'Primary navigation',
    themeToDark: 'Use dark theme',
    themeToLight: 'Use light theme',
    language: 'Language',
    skip: 'Skip to content'
  },
  hero: {
    badge: 'Open source · MIT',
    title: 'Your files,',
    titleAccent: 'at your pace.',
    description:
      'Cosmarium pairs the speed of a native app with an interface made for real work. Browse, transfer, organize and find everything without breaking your flow.',
    primary: 'Download for desktop',
    secondary: 'View on GitHub',
    meta: ['Windows', 'Linux', 'Tauri + Rust', 'MIT license'],
    previewAlt:
      'Preview of the Cosmarium interface: tabs, quick access sidebar, file list and details pane.'
  },
  preview: {
    tabs: ['Home', 'Projects'],
    path: 'C:\\Users\\levi\\Projects',
    quickGroup: 'Quick access',
    favoriteGroup: 'Favorites',
    quick: {
      home: 'Home',
      documents: 'Documents',
      downloads: 'Downloads',
      pictures: 'Pictures',
      music: 'Music',
      videos: 'Videos',
      trash: 'Trash'
    },
    favorites: {
      cosmarium: 'cosmarium',
      brand: 'Brand kit'
    },
    title: 'Projects',
    newFolder: 'New folder',
    table: {
      name: 'Name',
      modified: 'Modified',
      size: 'Size'
    },
    rows: [
      { name: 'cosmarium', modified: 'Today, 2:32 PM', size: '—', kind: 'directory', selected: false },
      { name: 'marketing-site', modified: 'Yesterday, 6:04 PM', size: '—', kind: 'directory', selected: false },
      { name: 'screenshots', modified: 'Oct 12, 9:21 AM', size: '—', kind: 'directory', selected: false },
      { name: 'notes.md', modified: 'Today, 11:08 AM', size: '4 KB', kind: 'file', selected: false },
      { name: 'proposal.pdf', modified: 'Oct 28, 3:42 PM', size: '1.8 MB', kind: 'file', selected: true },
      { name: 'cover.png', modified: 'Oct 25, 5:10 PM', size: '2.4 MB', kind: 'file', selected: false },
      { name: 'soundtrack.mp3', modified: 'Oct 20, 8:15 PM', size: '6.1 MB', kind: 'file', selected: false }
    ],
    detailsTitle: 'Details',
    detailsName: 'proposal.pdf',
    tagsLabel: 'Tags',
    tags: ['Client', 'Urgent'],
    sizeLabel: 'Size',
    sizeValue: '1.8 MB',
    modifiedLabel: 'Modified',
    modifiedValue: 'Oct 28, 2026, 3:42 PM',
    status: '7 items',
    statusSelected: '1 selected',
    transferTitle: 'Transferring 3 files',
    transferMeta: '68% · 24 MB/s',
    transferEta: '12 s left'
  },
  features: {
    eyebrow: 'Features',
    title: 'Everything a file explorer should be.',
    description:
      'No plugins, no lost windows, no waiting. The essentials are there, they work together, and they are built for people who live on a computer.',
    items: [
      {
        title: 'Tabs and dual panes',
        text: 'Compare folders side by side, drag between panes and keep as many tabs open as your browser.'
      },
      {
        title: 'Live updates',
        text: 'The app watches the disk and refreshes the list instantly. No F5, no stale contents.'
      },
      {
        title: 'Transfers you control',
        text: 'Copy and move with progress, speed, time remaining, pause, resume and cancellation.'
      },
      {
        title: 'Undo that works',
        text: 'Delete, move, rename. If something goes sideways, Ctrl+Z puts it back.'
      },
      {
        title: 'Rich previews',
        text: 'Images, PDFs, text, audio and video show up in the details pane without another app.'
      },
      {
        title: 'ZIP and batch rename',
        text: 'Archive and extract safely. Rename dozens of files with prefixes, numbering and a preview.'
      },
      {
        title: 'Search with filters',
        text: 'Find by name, extension, size, date or content — including inside subfolders.'
      },
      {
        title: 'Tags and quick access',
        text: 'Color-code files, pin folders and create shortcuts for what you open every day.'
      },
      {
        title: 'Built for the keyboard',
        text: 'Shortcuts for everything, row navigation and accessible dialogs. The mouse is optional.'
      }
    ]
  },
  shortcuts: {
    eyebrow: 'Shortcuts',
    title: 'At the speed of your fingers.',
    description:
      'The commands you already know, with room to customize every combination in Settings › Shortcuts.',
    items: [
      { keys: ['Ctrl', 'T'], label: 'New tab' },
      { keys: ['Ctrl', 'Shift', 'N'], label: 'New folder' },
      { keys: ['F2'], label: 'Rename' },
      { keys: ['Space'], label: 'Preview' },
      { keys: ['Ctrl', 'E'], label: 'Details pane' },
      { keys: ['Ctrl', 'F'], label: 'Search' },
      { keys: ['Ctrl', 'Z'], label: 'Undo' },
      { keys: ['F1'], label: 'See all shortcuts' }
    ],
    note: 'Default combinations. Every one can be changed.'
  },
  stack: {
    eyebrow: 'Open inside',
    title: 'Truly native. Light by design.',
    description:
      'The interface runs on React. Rust talks to the disk. The result is a fast app that uses little memory and does not ship an entire browser.',
    code: {
      file: 'stack.json',
      lines: [
        { key: 'shell', value: 'tauri 2 · rust' },
        { key: 'interface', value: 'react 18 · typescript' },
        { key: 'state', value: 'zustand' },
        { key: 'build', value: 'vite' },
        { key: 'license', value: 'MIT' }
      ]
    },
    tech: [
      { name: 'Tauri 2', role: 'Native shell' },
      { name: 'Rust', role: 'File backend' },
      { name: 'React 18', role: 'Interface' },
      { name: 'TypeScript', role: 'End-to-end types' }
    ],
    principles: [
      {
        title: 'Private by default',
        text: 'No telemetry, no account. Your files never leave your machine.'
      },
      {
        title: 'Open from top to bottom',
        text: 'MIT licensed across the backend, the frontend and this site.'
      },
      {
        title: 'Light by design',
        text: 'The system webview instead of an embedded Chromium.'
      }
    ]
  },
  download: {
    eyebrow: 'Get started',
    title: 'Put your files in order.',
    description:
      'Windows and Linux packages are published on GitHub Releases. Prefer to build it yourself? The project uses pnpm and stable Rust.',
    primary: 'View releases',
    secondary: 'Read the README',
    platforms: [
      { name: 'Windows', detail: 'Native installer' },
      { name: 'Linux', detail: 'System packages' },
      { name: 'Source code', detail: 'Rust + pnpm' }
    ],
    cloneLabel: 'Build from source',
    copy: 'Copy command',
    copied: 'Copied!',
    requirement: 'Requires Node.js 24+, pnpm 10+ and stable Rust.'
  },
  footer: {
    tagline: 'A file manager for Windows and Linux, built with Tauri, Rust and React.',
    product: 'Product',
    resources: 'Resources',
    project: 'Project',
    releases: 'Releases',
    readme: 'README',
    issues: 'Issues',
    license: 'MIT License',
    source: 'Source code',
    madeBy: 'Made by levi5',
    backToTop: 'Back to top',
    copyright: '© 2026 Cosmarium. Open source under the MIT license.'
  }
}

const dictionaries = { 'pt-BR': pt, en }

export type SiteContent = typeof pt

export function createTranslator(language: Language): SiteContent {
  return dictionaries[language] ?? pt
}
