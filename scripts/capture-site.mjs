import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { installScreenshotFixture } from './screenshot-fixture.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const profile = await mkdtemp(path.join(process.env.TMPDIR || tmpdir(), 'cosmarium-screenshots-'))
const app = await createServer({ root, server: { host: '127.0.0.1', port: 0, strictPort: false } })
const site = await createServer({
  root: path.join(root, 'web'), configFile: path.join(root, 'web/vite.config.ts'),
  server: { host: '127.0.0.1', port: 0, strictPort: false }
})
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
  '--headless', '--disable-gpu', '--hide-scrollbars', '--remote-debugging-port=0',
  ...(process.env.CHROME_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
  `--user-data-dir=${profile}`, 'about:blank'
])
let socket
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = ''
    chrome.stderr.on('data', chunk => {
      output += chunk
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/)
      if (match) resolve(match[1])
    })
    chrome.on('error', reject)
    chrome.on('exit', code => reject(new Error(`Chrome exited (${code}): ${output}`)))
  })
  socket = new WebSocket(endpoint)
  await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }))
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', event => {
    const data = JSON.parse(event.data)
    if (!pending.has(data.id)) return
    const { resolve, reject } = pending.get(data.id)
    pending.delete(data.id)
    data.error ? reject(new Error(JSON.stringify(data.error))) : resolve(data.result)
  })
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    pending.set(++id, { resolve, reject })
    socket.send(JSON.stringify({ id, method, params, sessionId }))
  })
  await Promise.all([app.listen(), site.listen()])
  const appUrl = app.resolvedUrls.local[0]
  const siteUrl = site.resolvedUrls.local[0]
  const output = path.join(root, 'web/public/screenshots')
  await mkdir(output, { recursive: true })

  async function capture(url, filename, width, height, initialization, prepare) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true })
    const page = (method, params) => send(method, params, sessionId)
    await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
    await page('Page.enable')
    await page('Page.addScriptToEvaluateOnNewDocument', { source: initialization })
    const loaded = new Promise(resolve => socket.addEventListener('message', function listener(event) {
      const data = JSON.parse(event.data)
      if (data.method === 'Page.loadEventFired' && data.sessionId === sessionId) {
        socket.removeEventListener('message', listener)
        resolve()
      }
    }))
    await page('Page.navigate', { url })
    await loaded
    const result = await page('Runtime.evaluate', {
      expression: `(async () => {
        const waitFor = predicate => new Promise((resolve, reject) => {
          const deadline = performance.now() + 15000;
          function check() {
            if (predicate()) return resolve();
            if (performance.now() > deadline) return reject(new Error('Screenshot UI did not become ready'));
            requestAnimationFrame(check);
          }
          check();
        });
        ${prepare}
        await document.fonts.ready;
        const style = document.createElement('style');
        style.textContent = '*{animation-duration:0.001s!important;animation-delay:0s!important;transition:none!important} [data-reveal]{opacity:1!important;transform:none!important}';
        document.head.append(style);
        await Promise.all([...document.images].map(image => image.decode()));
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        await waitFor(() => [...document.querySelectorAll('.file-row')].every(row => getComputedStyle(row).opacity === '1'));
      })()`, awaitPromise: true
    })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    const { data } = await page('Page.captureScreenshot', { format: 'png' })
    await writeFile(filename, Buffer.from(data, 'base64'))
    console.log(`Saved ${path.relative(root, filename)}`)
    await send('Target.closeTarget', { targetId })
  }

  for (const language of ['pt-BR', 'en']) {
    for (const theme of ['dark', 'light']) {
      const locale = language === 'en' ? 'en' : 'pt'
      await capture(appUrl, path.join(output, `cosmarium-${locale}-${theme}.png`), 1280, 900,
        `(${installScreenshotFixture.toString()})(${JSON.stringify(language)}, ${JSON.stringify(theme)})`,
        `await waitFor(() => document.querySelectorAll('[role="option"]').length === 7);
         const row = [...document.querySelectorAll('[role="option"]')].find(row => row.textContent.includes('${locale === 'en' ? 'aurora-guide.pdf' : 'guia-aurora.pdf'}'));
         row.click();
         await waitFor(() => document.querySelector('.details-pane__props'));`)
    }
  }
  await capture(siteUrl, path.join(root, 'web/public/og.png'), 1200, 630,
    `localStorage.clear();localStorage.setItem('cosmarium-site-theme','dark');localStorage.setItem('cosmarium-site-language','pt-BR');`,
    `await waitFor(() => document.querySelector('.app-window'));`)
} finally {
  socket?.close()
  const exited = new Promise(resolve => chrome.once('exit', resolve))
  if (chrome.exitCode === null && chrome.pid) {
    chrome.kill()
    await exited
  }
  await Promise.all([app.close(), site.close()])
  await rm(profile, { recursive: true, force: true })
}
