import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mdToPdf } from 'md-to-pdf'
import { PDFDocument } from 'pdf-lib'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function generateDocs() {
  const docsDir = path.join(__dirname, 'docs')
  const originalPdfPath = path.join(docsDir, 'hunt_models_guida_utente.pdf')
  const appendixMdPath = path.join(docsDir, 'appendice.md')
  const outputPdfPath = path.join(docsDir, 'Manuale_Hunt_Completo.pdf')

  console.log('📄 Convertendo docs/appendice.md in PDF...')

  const pdfOutput = await mdToPdf(
    { path: appendixMdPath },
    {
      launch_options: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      pdf_options: {
        format: 'A4',
        margin: '20mm',
        printBackground: true,
      },
      css: `
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          line-height: 1.6;
          color: #1e293b;
        }
        h1 { font-size: 22px; color: #0f172a; margin-bottom: 16px; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
        h2 { font-size: 18px; color: #1e293b; margin-top: 24px; margin-bottom: 12px; }
        h3 { font-size: 15px; color: #334155; margin-top: 20px; margin-bottom: 10px; }
        h4 { font-size: 14px; color: #475569; margin-top: 14px; margin-bottom: 6px; }
        p { margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: 600; color: #0f172a; }
        blockquote { background: #f8fafc; border-left: 4px solid #0284c7; padding: 10px 14px; margin: 16px 0; border-radius: 4px; }
        hr { border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0; }
        ul, ol { padding-left: 20px; margin-bottom: 12px; }
        li { margin-bottom: 4px; }
      `,
    }
  )

  if (!pdfOutput || !pdfOutput.content) {
    throw new Error('Impossibile generare il PDF dall’appendice Markdown.')
  }

  console.log('🔄 Unione del PDF originale con l’appendice generata...')

  const originalPdfBytes = await fs.readFile(originalPdfPath)
  const appendixPdfBytes = pdfOutput.content

  const mergedPdf = await PDFDocument.create()

  const originalDoc = await PDFDocument.load(originalPdfBytes)
  const appendixDoc = await PDFDocument.load(appendixPdfBytes)

  const originalPages = await mergedPdf.copyPages(originalDoc, originalDoc.getPageIndices())
  originalPages.forEach(page => mergedPdf.addPage(page))

  const appendixPages = await mergedPdf.copyPages(appendixDoc, appendixDoc.getPageIndices())
  appendixPages.forEach(page => mergedPdf.addPage(page))

  const mergedPdfBytes = await mergedPdf.save()

  await fs.writeFile(outputPdfPath, mergedPdfBytes)

  console.log(`✅ Manuale completo generato con successo: ${outputPdfPath}`)
}

generateDocs().catch(err => {
  console.error('❌ Errore durante la generazione del manuale:', err)
  process.exit(1)
})
