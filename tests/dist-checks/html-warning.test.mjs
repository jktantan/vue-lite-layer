import { readFileSync } from 'node:fs'

const files = ['dist/vue-lite-layer.es.js', 'dist/vue-lite-layer.umd.js']
const warningText = 'content string is rendered as trusted HTML'

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  if (!content.includes(warningText)) {
    throw new Error(`${file} does not preserve the trusted HTML warning text`)
  }
}
