import fs from 'fs';
import path from 'path';
import { execFileSync, execSync } from 'child_process';
import os from 'os';
import mammoth from 'mammoth';

/**
 * Extract text content from a .doc file using catdoc or antiword.
 */
function extractDocText(filePath: string): string {
  // Try antiword first (available on Alpine), then fallback
  const tools = ['antiword', 'catdoc'];
  for (const tool of tools) {
    try {
      const result = execSync(`${tool} "${filePath}"`, {
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
      });
      const text = result.toString().trim();
      if (text.length > 50) {
        console.log(`Extracted ${text.length} chars from .doc using ${tool}`);
        return text;
      }
    } catch {
      // try next tool
    }
  }
  // Fallback: try python3 with olefile
  try {
    const result = execSync(`python3 -c "
import sys, struct
try:
    with open('${filePath.replace(/'/g, "'\\''")}', 'rb') as f:
        data = f.read()
    # Try to extract readable text from binary .doc
    text = ''
    i = 0
    while i < len(data):
        b = data[i]
        if 0x20 <= b <= 0x7e or b in (0x0a, 0x0d, 0x09) or b >= 0x80:
            text += chr(b)
        i += 1
    # Filter to Chinese + ASCII lines
    lines = [l.strip() for l in text.split('\\n') if len(l.strip()) > 5]
    print('\\n'.join(lines[:500]))
except Exception as e:
    sys.stderr.write(str(e))
" 2>/dev/null`, {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const text = result.toString().trim();
    if (text.length > 100) {
      console.log(`Extracted ${text.length} chars from .doc using python3 fallback`);
      return text;
    }
  } catch {
    // give up
  }
  return '';
}

/**
 * Extract text content from a file. Supports TXT, DOC, DOCX, PDF (with OCR fallback).
 */
export async function readFileContent(filePath: string, maxLength = 5000): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8').slice(0, maxLength);
  }

  if (ext === '.doc') {
    const text = extractDocText(filePath);
    if (text) {
      return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
    }
    console.error('Failed to extract .doc content, no tools available');
    return '';
  }

  if (ext === '.docx') {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
    } catch (err) {
      console.error('DOCX extraction error:', (err as Error).message);
    }
  }

  if (ext === '.pdf') {
    // Step 1: Try pdfjs text extraction (works for text-based PDFs)
    try {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const buffer = fs.readFileSync(filePath);
      const uint8 = new Uint8Array(buffer);
      const doc = await getDocument({ data: uint8 }).promise;
      const texts: string[] = [];
      for (let i = 1; i <= Math.min(doc.numPages, 30); i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        texts.push(pageText);
        if (texts.join('\n').length >= maxLength) break;
      }
      const result = texts.join('\n').replace(/\s+/g, ' ').trim();

      // Detect if pdfjs returned meaningful text vs empty/garbage
      // Scanned PDFs return empty or near-empty results
      const meaningfulChars = (result.match(/[一-龥a-zA-Z0-9]/g) || []).length;
      if (result && meaningfulChars > 100) {
        console.log(`pdfjs extracted ${meaningfulChars} meaningful chars`);
        return result.slice(0, maxLength);
      }
      console.log(`pdfjs got ${meaningfulChars} meaningful chars (likely scanned PDF), falling back to OCR`);
    } catch (err) {
      console.error('PDF text extraction error:', (err as Error).message);
    }

    // Step 2: OCR for scanned PDFs - use pdftoppm + tesseract via stdin
    try {
      const ocrText = await ocrPdfWithPdftoppm(filePath, maxLength);
      if (ocrText && ocrText.length > 0) {
        return ocrText;
      }
    } catch (err) {
      console.error('PDF OCR error:', (err as Error).message);
    }

    // No raw-buffer fallback for PDF — returning binary garbage breaks AI extraction
    return '';
  }

  // For other formats, try raw buffer text extraction
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('utf-8')
      .replace(/[^一-鿿\w\s.,;:!?，。；：！？、（）《》""''\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
  } catch {
    return '';
  }
}

/**
 * OCR a scanned PDF using pdftoppm (poppler) + tesseract.
 * Pipes image bytes through stdin to tesseract to avoid the macOS
 * absolute-path bug where tesseract fails to open files via leptonica.
 */
async function ocrPdfWithPdftoppm(filePath: string, maxLength: number): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-ocr-'));
  try {
    const outPrefix = path.join(tmpDir, 'page');

    // Convert up to 10 pages at 200 DPI — enough to cover cover + parties + terms + payment
    // for typical contracts. Higher pages = much slower OCR.
    try {
      execFileSync('pdftoppm', [
        '-r', '200',
        '-f', '1',
        '-l', '10',
        '-png',
        filePath,
        outPrefix,
      ], {
        timeout: 120000,
        stdio: ['ignore', 'ignore', 'pipe'],
      });
    } catch (err) {
      throw new Error(`pdftoppm failed (is poppler installed? brew install poppler): ${(err as Error).message}`);
    }

    const pageFiles = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.png'))
      .sort();

    if (pageFiles.length === 0) {
      throw new Error('pdftoppm produced no images');
    }

    let fullText = '';
    for (const pageFile of pageFiles) {
      const pngPath = path.join(tmpDir, pageFile);
      try {
        const imageBuffer = fs.readFileSync(pngPath);
        // Pipe via stdin (use '-' as input) — avoids macOS leptonica path bug
        const text = execFileSync(
          'tesseract',
          ['-', 'stdout', '-l', 'chi_sim+eng'],
          {
            input: imageBuffer,
            timeout: 60000,
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'ignore'],
          },
        ).toString();
        fullText += text + '\n';
      } catch (err) {
        console.error(`OCR page ${pageFile} failed:`, (err as Error).message);
      }
      try { fs.unlinkSync(pngPath); } catch {}
      if (fullText.length >= maxLength) break;
    }

    return fullText.replace(/\s+/g, ' ').trim().slice(0, maxLength);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}
