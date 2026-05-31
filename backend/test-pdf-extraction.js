import { readFileContent } from './src/services/file-reader.js';

const pdfPath = '/Users/hadwinhuang/Desktop/盖章版-深圳美高梅酒店园林绿植养护项目合同.pdf';

async function testExtraction() {
  console.log('开始提取 PDF...\n');

  try {
    const text = await readFileContent(pdfPath);

    console.log('=== 提取结果 ===');
    console.log('文本长度:', text.length);
    console.log('\n前 2000 字符:');
    console.log(text.substring(0, 2000));
    console.log('\n...\n');
    console.log('后 1000 字符:');
    console.log(text.substring(Math.max(0, text.length - 1000)));

    // 检查关键字段
    console.log('\n=== 关键字段检测 ===');
    const keywords = ['甲方', '乙方', '合同', '金额', '日期', '签订', '项目'];
    keywords.forEach(keyword => {
      const count = (text.match(new RegExp(keyword, 'g')) || []).length;
      console.log(`"${keyword}" 出现次数: ${count}`);
    });

  } catch (error) {
    console.error('提取失败:', error.message);
    console.error(error.stack);
  }
}

testExtraction();
