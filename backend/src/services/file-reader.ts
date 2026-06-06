import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import os from 'os';
import mammoth from 'mammoth';

function hasCommand(command: string): boolean {
  try {
    execFileSync('/bin/sh', ['-lc', `command -v ${command}`], {
      timeout: 5000,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function scoreContractText(text: string): number {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return 0;

  let score = Math.min(normalized.length, 20000) / 100;
  const signals = [
    '合同编号', '甲方', '乙方', '签约时间', '第一条', '第二条',
    '代销合同', '商品代销', '采购合同', '服务合同', '劳动合同',
    '税率', '结算', '付款', '验收', '违约责任', '争议',
    '深圳美高梅酒店', '美高梅', 'MGM',
  ];
  for (const signal of signals) {
    if (normalized.includes(signal)) score += 50;
  }
  if (/^.{0,120}(合同编号|[\s\S]{0,50}合同)/.test(normalized)) score += 120;
  if (normalized.includes('甲方') && normalized.includes('乙方')) score += 150;
  return score;
}

function decodeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function unzipText(filePath: string, entry: string): string {
  if (!hasCommand('unzip')) return '';
  try {
    return execFileSync('unzip', ['-p', filePath, entry], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    }).toString();
  } catch {
    return '';
  }
}

function listZipEntries(filePath: string): string[] {
  if (!hasCommand('unzip')) return [];
  try {
    const output = execFileSync('unzip', ['-Z1', filePath], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    }).toString();
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function xmlToPlainText(xml: string): string {
  if (!xml) return '';
  const lines: string[] = [];
  const paragraphMatches = xml.match(/<w:p[\s\S]*?<\/w:p>/g) || [];
  for (const paragraph of paragraphMatches) {
    const parts = [...paragraph.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>|<w:cr\/>/g)]
      .map((match) => {
        if (match[0].startsWith('<w:tab')) return '\t';
        if (match[0].startsWith('<w:br') || match[0].startsWith('<w:cr')) return '\n';
        return decodeXmlText(match[1] || '');
      });
    const line = parts.join('').replace(/[ \t]+/g, ' ').trim();
    if (line) lines.push(line);
  }
  return normalizeExtractedText(lines.join('\n'));
}

function mergeTextCandidates(candidates: { source: string; text: string }[], maxLength: number): string {
  const usable = candidates
    .map((candidate) => ({ ...candidate, text: normalizeExtractedText(candidate.text) }))
    .filter((candidate) => candidate.text.length > 0)
    .sort((a, b) => scoreContractText(b.text) - scoreContractText(a.text));

  if (usable.length === 0) return '';

  let merged = usable[0].text;
  for (const candidate of usable.slice(1)) {
    const chunks = candidate.text.split(/\n{2,}|(?=附件|合同附件|附录|Schedule|Appendix)/).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 80);
    for (const chunk of chunks) {
      const key = chunk.slice(0, 80);
      if (!merged.includes(key) && merged.length + chunk.length + 20 <= maxLength * 1.2) {
        merged += `\n\n[${candidate.source}补充]\n${chunk}`;
      }
    }
  }

  return normalizeExtractedText(merged).slice(0, maxLength);
}

function extractDocTextWithTextutil(filePath: string): string {
  if (process.platform !== 'darwin' || !hasCommand('textutil')) return '';
  try {
    const result = execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
    });
    return normalizeExtractedText(result.toString());
  } catch (err) {
    console.error('textutil .doc extraction failed:', (err as Error).message);
    return '';
  }
}

function extractDocTextWithAntiword(filePath: string): string {
  if (!hasCommand('antiword')) return '';
  try {
    const result = execFileSync('antiword', ['-m', 'UTF-8', filePath], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
    });
    return normalizeExtractedText(result.toString());
  } catch (err) {
    console.error('antiword .doc extraction failed:', (err as Error).message);
    return '';
  }
}

function extractDocTextWithPython(filePath: string): string {
  try {
    const script = String.raw`
import sys, re

with open(sys.argv[1], 'rb') as f:
    data = f.read()

# Method 1: Extract UTF-16LE text (common in .doc files)
texts = []
try:
    # Try UTF-16LE decoding on chunks
    decoded = data.decode('utf-16le', errors='ignore')
    # Filter to keep only lines with meaningful Chinese + ASCII content
    lines = decoded.split('\\n')
    for line in lines:
        clean = re.sub(r'[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f]', '', line).strip()
        # Count meaningful characters
        cn = len(re.findall(r'[\\u4e00-\\u9fff]', clean))
        en = len(re.findall(r'[a-zA-Z0-9]', clean))
        if cn + en > 10 and cn > 0:
            texts.append(clean)
except:
    pass

if texts:
    result = '\\n'.join(texts)
    # Trim only obvious binary tail. Do not trim the beginning by marker:
    # Word .doc files often contain repeated fragments, and the first matching
    # marker can appear in the middle of the contract.
    end_markers = ['盖章', '签字', '日期', 'PAGE', '以下无正文']
    end_pos = -1
    end_marker_used = ''
    for m in end_markers:
        pos = result.rfind(m)
        if pos > end_pos:
            end_pos = pos
            end_marker_used = m
    if end_pos > 0 and end_marker_used:
        result = result[:end_pos + len(end_marker_used)]
    print(result)
    sys.exit(0)

# Method 2: Binary scan for Chinese text sequences
text = ''
i = 0
while i < len(data) - 1:
    # Look for UTF-16LE Chinese characters (two bytes: low byte + high byte 0x4E-0x9F)
    b0 = data[i]
    b1 = data[i+1]
    if 0x20 <= b0 <= 0x7e and b1 == 0x00:
        text += chr(b0)
        i += 2
    elif b0 >= 0x80 and 0x4E <= b1 <= 0x9F:
        # Potential Chinese character in UTF-16LE
        try:
            ch = (b1 << 8) | b0
            text += chr(ch)
            i += 2
        except:
            text += chr(b0) if 0x20 <= b0 <= 0x7e else ' '
            i += 1
    elif b0 in (0x0a, 0x0d):
        text += chr(b0)
        i += 1
    else:
        i += 1

# Filter to meaningful lines with Chinese content
lines = [l.strip() for l in text.split('\\n') if len(l.strip()) > 5 and len(re.findall(r'[\\u4e00-\\u9fff]', l)) > 3]
if lines:
    print('\\n'.join(lines))
else:
    sys.exit(1)
`;
    const result = execFileSync('python3', ['-c', script, filePath], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const text = result.toString().trim();
    if (text.length > 100) {
      console.log(`Extracted ${text.length} chars from .doc using python3`);
      return normalizeExtractedText(text);
    }
  } catch {
    // give up
  }
  return '';
}

/**
 * Extract text content from a legacy .doc file.
 */
function extractDocText(filePath: string): string {
  const candidates = [
    { source: 'textutil', text: extractDocTextWithTextutil(filePath) },
    { source: 'antiword', text: extractDocTextWithAntiword(filePath) },
    { source: 'python3', text: extractDocTextWithPython(filePath) },
  ].filter((c) => c.text.length > 0);

  if (candidates.length === 0) return '';

  candidates.sort((a, b) => scoreContractText(b.text) - scoreContractText(a.text));
  const best = candidates[0];
  console.log(`Selected .doc extraction from ${best.source} (${best.text.length} chars, score ${Math.round(scoreContractText(best.text))})`);
  return best.text;
}

function extractDocxTextWithTextutil(filePath: string): string {
  if (process.platform !== 'darwin' || !hasCommand('textutil')) return '';
  try {
    const result = execFileSync('textutil', ['-convert', 'txt', '-stdout', filePath], {
      timeout: 30000,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return normalizeExtractedText(result.toString());
  } catch (err) {
    console.error('textutil .docx extraction failed:', (err as Error).message);
    return '';
  }
}

function extractDocxTextFromXml(filePath: string): string {
  const entries = listZipEntries(filePath).filter((entry) => (
    entry === 'word/document.xml'
    || /^word\/header\d+\.xml$/.test(entry)
    || /^word\/footer\d+\.xml$/.test(entry)
    || entry === 'word/comments.xml'
    || entry === 'word/footnotes.xml'
    || entry === 'word/endnotes.xml'
  ));

  const parts: string[] = [];
  for (const entry of entries) {
    const text = xmlToPlainText(unzipText(filePath, entry));
    if (text) parts.push(`[${entry}]\n${text}`);
  }
  return normalizeExtractedText(parts.join('\n\n'));
}

async function extractDocxText(filePath: string, maxLength: number): Promise<string> {
  const candidates: { source: string; text: string }[] = [];
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    candidates.push({ source: 'mammoth', text: result.value });
  } catch (err) {
    console.error('DOCX mammoth extraction error:', (err as Error).message);
  }

  candidates.push({ source: 'textutil', text: extractDocxTextWithTextutil(filePath) });
  candidates.push({ source: 'word-xml', text: extractDocxTextFromXml(filePath) });

  const mediaText = ocrOfficeMediaImages(filePath, maxLength);
  if (mediaText) candidates.push({ source: 'embedded-image-ocr', text: mediaText });

  const text = mergeTextCandidates(candidates, maxLength);
  if (text) {
    console.log(`Selected/merged .docx extraction (${text.length} chars)`);
  }
  return text;
}

function extractCsvText(filePath: string, maxLength: number): string {
  return normalizeExtractedText(fs.readFileSync(filePath, 'utf-8')).slice(0, maxLength);
}

function extractXlsText(filePath: string, maxLength: number): string {
  if (hasCommand('xls2csv')) {
    try {
      const result = execFileSync('xls2csv', ['-x', filePath], {
        timeout: 30000,
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      });
      return normalizeExtractedText(result.toString()).slice(0, maxLength);
    } catch (err) {
      console.error('xls2csv .xls extraction failed:', (err as Error).message);
    }
  }

  const text = extractDocTextWithTextutil(filePath);
  return text.slice(0, maxLength);
}

function extractXlsxText(filePath: string, maxLength: number): string {
  const entries = listZipEntries(filePath);
  const sharedStringsXml = unzipText(filePath, 'xl/sharedStrings.xml');
  const sharedStrings = [...sharedStringsXml.matchAll(/<si[\s\S]*?<\/si>/g)].map((match) => {
    const texts = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((textMatch) => decodeXmlText(textMatch[1] || ''));
    return texts.join('');
  });

  const sheetEntries = entries
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const output: string[] = [];
  for (const sheetEntry of sheetEntries) {
    output.push(`## 工作表：${path.basename(sheetEntry, '.xml')}`);
    const xml = unzipText(filePath, sheetEntry);
    const rows = xml.match(/<row[\s\S]*?<\/row>/g) || [];
    for (const row of rows) {
      const cells = [...row.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map((cellMatch) => {
        const attrs = cellMatch[1] || '';
        const body = cellMatch[2] || '';
        const type = attrs.match(/\bt="([^"]+)"/)?.[1];
        const value = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || '';
        const inline = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || '';
        if (type === 's') return sharedStrings[Number(value)] || '';
        if (type === 'inlineStr') return decodeXmlText(inline);
        return decodeXmlText(value);
      }).map((cell) => cell.trim());
      if (cells.some(Boolean)) output.push(cells.join('\t'));
      if (output.join('\n').length >= maxLength) break;
    }
    if (output.join('\n').length >= maxLength) break;
  }

  return normalizeExtractedText(output.join('\n')).slice(0, maxLength);
}

/**
 * Extract text content from a file. Supports TXT, CSV, DOC, DOCX, XLSX,
 * images, and PDF (with OCR fallback).
 */
export async function readFileContent(filePath: string, maxLength = 5000): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt' || ext === '.csv' || ext === '.tsv') {
    return extractCsvText(filePath, maxLength);
  }

  if (ext === '.doc') {
    const text = extractDocText(filePath);
    if (text) {
      return normalizeExtractedText(text).slice(0, maxLength);
    }
    console.error('Failed to extract .doc content, no tools available');
    return '';
  }

  if (ext === '.docx') {
    return extractDocxText(filePath, maxLength);
  }

  if (ext === '.xlsx') {
    return extractXlsxText(filePath, maxLength);
  }

  if (ext === '.xls') {
    return extractXlsText(filePath, maxLength);
  }

  if (['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff'].includes(ext)) {
    return ocrImageFile(filePath, maxLength);
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
      throw new Error(`pdftoppm failed (install poppler-utils in Linux/Docker): ${(err as Error).message}`);
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
        const text = ocrImageBuffer(imageBuffer);
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

function ocrImageBuffer(imageBuffer: Buffer): string {
  if (!hasCommand('tesseract')) {
    throw new Error('tesseract is not installed');
  }
  return execFileSync(
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
}

function ocrImageFile(filePath: string, maxLength: number): string {
  try {
    const text = ocrImageBuffer(fs.readFileSync(filePath));
    return normalizeExtractedText(text).slice(0, maxLength);
  } catch (err) {
    console.error('Image OCR error:', (err as Error).message);
    return '';
  }
}

function ocrOfficeMediaImages(filePath: string, maxLength: number): string {
  if (!hasCommand('unzip') || !hasCommand('tesseract')) return '';
  const entries = listZipEntries(filePath)
    .filter((entry) => /^word\/media\/.+\.(png|jpe?g|webp|bmp|tiff?)$/i.test(entry))
    .slice(0, 12);
  const parts: string[] = [];
  for (const entry of entries) {
    try {
      const imageBuffer = execFileSync('unzip', ['-p', filePath, entry], {
        timeout: 30000,
        maxBuffer: 30 * 1024 * 1024,
      });
      const text = normalizeExtractedText(ocrImageBuffer(imageBuffer));
      if (text) parts.push(`[${entry} OCR]\n${text}`);
    } catch (err) {
      console.error(`Embedded image OCR failed (${entry}):`, (err as Error).message);
    }
    if (parts.join('\n').length >= maxLength) break;
  }
  return normalizeExtractedText(parts.join('\n\n')).slice(0, maxLength);
}
