import { existsSync, openAsBlob, readFileSync } from 'node:fs'

const dir = 'almanac.crosspoint-plugin'
const { name, files }: { name: string; files: string[] } = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))
const host = `http://${process.argv[2] ?? 'crosspoint.local'}`
const target = `/plugins/${name}`
const SERVER = 'https://almanac.im'
// A gitignored config.json points this upload at another server, such as a dev Worker on the LAN.
const server: string = existsSync(`${dir}/config.json`)
  ? JSON.parse(readFileSync(`${dir}/config.json`, 'utf8')).server
  : SERVER

const post = (path: string, body: URLSearchParams | FormData) =>
  fetch(`${host}${path}`, { method: 'POST', body }).catch(() => {
    console.error(`Can't reach ${host}. Is the reader in File Transfer mode on this Wi-Fi? Pass its IP: yarn upload 192.168.x.x`)
    process.exit(1)
  })

await post('/mkdir', new URLSearchParams({ name: 'plugins', path: '/' }))
await post('/mkdir', new URLSearchParams({ name, path: '/plugins' }))
for (const file of files) {
  // Some firmware ignores ?overwrite=1 and refuses an existing file.
  await post('/delete', new URLSearchParams({ path: `${target}/${file}` }))
  const form = new FormData()
  const blob =
    file === 'device.json'
      ? new Blob([readFileSync(`${dir}/${file}`, 'utf8').replaceAll(SERVER, server)])
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
