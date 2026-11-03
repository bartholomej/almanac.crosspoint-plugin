import { readFileSync, writeFileSync } from 'node:fs'
import { buildNumber, builds } from './build-number.ts'

const { version }: { version: string } = JSON.parse(readFileSync('package.json', 'utf8'))
const build = buildNumber(version)

for (const file of ['almanac.crosspoint-plugin/manifest.json', 'almanac.crosspoint-plugin/device.json']) {
  const json = readFileSync(file, 'utf8')
  // A regex keeps the hand formatting that JSON.stringify would undo.
  const bumped = json
    .replace(/"version": "[^"]*"/, `"version": "${version}"`)
    .replace(/([?&]build=)\d+/g, `$1${build}`)
  if (JSON.parse(bumped).version !== version) throw new Error(`No version to bump in ${file}`)
  if (file.endsWith('device.json') && !builds(bumped).length) throw new Error(`No build to bump in ${file}`)
  writeFileSync(file, bumped)
}
