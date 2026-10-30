import { existsSync, readFileSync, statSync } from 'node:fs'

type Shared = Record<'title' | 'description' | 'author' | 'version', string>
type Manifest = Shared & { name: string; files: string[] }

const dir = 'almanac.crosspoint-plugin'
const read = (file: string) => JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'))
const manifest: Manifest = read('manifest.json')
const device: Shared = read('device.json')
const tag = process.argv[2]

const errors: string[] = []
if (dir !== `${manifest.name}.crosspoint-plugin`) errors.push(`Payload folder ${dir} doesn't match manifest name ${manifest.name}`)
if (tag && tag !== `v${manifest.version}`) errors.push(`Tag ${tag} doesn't match manifest version ${manifest.version}`)
for (const key of ['title', 'description', 'author', 'version'] as const) {
  if (manifest[key] !== device[key]) errors.push(`${key} differs between manifest.json and device.json`)
}
for (const file of manifest.files) {
  if (!existsSync(`${dir}/${file}`)) errors.push(`${file} is listed in manifest files but missing`)
}
if (statSync(`${dir}/device.json`).size > 8192) errors.push('device.json is over the 8 KB firmware limit')

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
