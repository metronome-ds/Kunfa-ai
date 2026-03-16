import { createClient } from '@supabase/supabase-js'

function getStorageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Server-side upload — used by the report generator and other server code
 * that already has the file bytes in memory.
 */
export async function uploadFile(file: File | Blob, filename: string): Promise<string> {
  const supabase = getStorageClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filename, buffer, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    })

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

/**
 * Fetch a file from a Blob URL and return its contents as a Buffer.
 */
export async function fetchBlobAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch blob: ${res.status} ${res.statusText}`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Extract text from a PDF buffer using pdf-parse (works in Node.js serverless).
 * Throws on failure instead of returning empty string.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  return data.text
}

/**
 * Extract text from an Excel spreadsheet (.xlsx, .xls) using the xlsx package.
 */
export async function extractTextFromSpreadsheet(buffer: Buffer): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })

  const textParts: string[] = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    if (csv.trim()) {
      textParts.push(`--- Sheet: ${sheetName} ---\n${csv}`)
    }
  }

  return textParts.join('\n\n')
}

/**
 * Given a Blob URL and the original filename, fetch the file and extract its
 * text content. PDFs use pdf-parse, spreadsheets use xlsx, CSVs read as UTF-8.
 * Throws on failure instead of returning empty string.
 */
export async function extractTextFromBlobUrl(
  url: string,
  filename: string,
): Promise<string> {
  const buffer = await fetchBlobAsBuffer(url)
  const lower = filename.toLowerCase()

  if (lower.endsWith('.pdf')) {
    const text = await extractTextFromPdf(buffer)
    if (!text || text.trim().length < 20) {
      throw new Error(
        `Could not extract meaningful text from PDF "${filename}". ` +
        `The file may be image-based (scanned). Please upload a text-based PDF.`
      )
    }
    return text
  }

  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const text = await extractTextFromSpreadsheet(buffer)
    if (!text || text.trim().length < 10) {
      throw new Error(
        `Could not extract data from spreadsheet "${filename}". The file may be empty or corrupted.`
      )
    }
    return text
  }

  if (lower.endsWith('.csv')) {
    const text = buffer.toString('utf-8')
    if (!text || text.trim().length < 10) {
      throw new Error(`CSV file "${filename}" appears to be empty.`)
    }
    return text
  }

  // Fallback for other types — try UTF-8
  const text = buffer.toString('utf-8')
  if (!text || text.trim().length < 10) {
    throw new Error(`Could not extract text from "${filename}". Unsupported or empty file.`)
  }
  return text
}
