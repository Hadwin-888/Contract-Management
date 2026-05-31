import fs from 'fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

async function testPDF() {
  try {
    const filePath = '/Users/hadwinhuang/Desktop/盖章版-深圳美高梅酒店园林绿植养护项目合同.pdf';
    const buffer = fs.readFileSync(filePath);
    const uint8 = new Uint8Array(buffer);

    console.log('开始解析PDF...');
    const doc = await getDocument({ data: uint8 }).promise;
    console.log('PDF页数:', doc.numPages);

    const texts = [];
    for (let i = 1; i <= Math.min(doc.numPages, 3); i++) {
      console.log(`正在读取第 ${i} 页...`);
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      texts.push(pageText);
    }

    const fullText = texts.join('\n');
    console.log('\n提取的文本长度:', fullText.length);
    console.log('\n前800个字符:');
    console.log(fullText.substring(0, 800));

  } catch (err) {
    console.error('PDF解析错误:', err.message);
    console.error('错误堆栈:', err.stack);
  }
}

testPDF();
