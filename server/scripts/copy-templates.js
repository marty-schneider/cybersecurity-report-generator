import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Paths
const srcTemplatesDir = join(__dirname, '..', 'src', 'templates')
const distTemplatesDir = join(__dirname, '..', 'dist', 'templates')
const templateFile = 'report.hbs'

try {
  // Create dist/templates directory if it doesn't exist
  if (!existsSync(distTemplatesDir)) {
    mkdirSync(distTemplatesDir, { recursive: true })
    console.log('Created dist/templates directory')
  }

  // Copy template file
  const srcFile = join(srcTemplatesDir, templateFile)
  const distFile = join(distTemplatesDir, templateFile)

  copyFileSync(srcFile, distFile)
  console.log(`✓ Copied ${templateFile} to dist/templates/`)

  process.exit(0)
} catch (error) {
  console.error('Failed to copy templates:', error)
  process.exit(1)
}
