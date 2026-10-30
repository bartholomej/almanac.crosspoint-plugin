import { readFileSync, writeFileSync } from 'node:fs'

const { version }: { version: string } = JSON.parse(readFileSync('package.json', 'utf8'))

for (const file of ['almanac.crosspoint-plugin/manifest.json', 'almanac.crosspoint-plugin/device.json']) {
  const json = readFileSync(file, 'utf8')
  // A regex keeps the hand formatting that JSON.stringify would undo.
  const bumped = json.replace(/"version": "[^"]*"/, `"version": "${version}"`)
  if (JSON.parse(bumped).version !== version) throw new Error(`No version to bump in ${file}`)
  writeFileSync(file, bumped)
}
