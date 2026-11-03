import { existsSync, openAsBlob, readFileSync } from 'node:fs'

const dir = 'almanac.crosspoint-plugin'
const { name, files }: { name: string; files: string[] } = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))
const host = `http://${process.argv[2] ?? 'crosspoint.local'}`
// The reader loads a plugin from the first of these folders that has it, so a copy installed from
// Plugin Hub in /.crosspoint/plugins hides one in /plugins.
const ROOTS = ['/.crosspoint/plugins', '/plugins', '/.plugins']
const SERVER = 'https://almanac.im'
const IMAGE = 'https://img.almanac.im'
// A gitignored config.json points this upload at other servers, such as dev Workers on the LAN:
// `server` for the API, `image` for the sleep screen picture.
const config: { server?: string; image?: string } = existsSync(`${dir}/config.json`)
  ? JSON.parse(readFileSync(`${dir}/config.json`, 'utf8'))
  : {}
const server = config.server ?? SERVER
const image = config.image ?? IMAGE

const post = (path: string, body: URLSearchParams | FormData) =>
  fetch(`${host}${path}`, { method: 'POST', body }).catch(() => {
    console.error(`Can't reach ${host}. Is the reader in File Transfer mode on this Wi-Fi? Pass its IP: yarn upload 192.168.x.x`)
    process.exit(1)
  })

async function installedRoot() {
  for (const root of ROOTS) {
    const res = await fetch(`${host}/api/files?path=${encodeURIComponent(root)}`).catch(() => null)
    const entries: { name: string; isDirectory: boolean }[] = res?.ok ? await res.json().catch(() => []) : []
    if (entries.some((entry) => entry.isDirectory && entry.name === name)) return root
  }
  return null
}

const installed = await installedRoot()
const target = `${installed ?? '/plugins'}/${name}`
if (!installed) {
  await post('/mkdir', new URLSearchParams({ name: 'plugins', path: '/' }))
  await post('/mkdir', new URLSearchParams({ name, path: '/plugins' }))
}
for (const file of files) {
  // Some firmware ignores ?overwrite=1 and refuses an existing file.
  await post('/delete', new URLSearchParams({ path: `${target}/${file}` }))
  const form = new FormData()
  const blob =
    file === 'device.json'
      ? new Blob([readFileSync(`${dir}/${file}`, 'utf8').replaceAll(SERVER, server).replaceAll(IMAGE, image)])
      : await openAsBlob(`${dir}/${file}`)
  form.append('file', blob, file)
  const res = await post(`/upload?path=${target}`, form)
  if (!res.ok) {
    console.error(`${file}: ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  console.log(`${file} → ${target}/${file}`)
}
console.log('Leave File Transfer on the reader to load the plugin.')
