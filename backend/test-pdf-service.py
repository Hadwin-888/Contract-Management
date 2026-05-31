#!/usr/bin/env python3
"""测试PDF服务"""

import sys
from pathlib import Path

# 添加app目录到Python路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.pdf_service import extract_text_from_pdf

def main():
    if len(sys.argv) < 2:
        print('用法: python test-pdf-service.py <PDF文件路径>')
        print('示例: python test-pdf-service.py ~/Documents/contract.pdf')
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not Path(pdf_path).exists():
        print(f'错误: 文件不存在: {pdf_path}')
        sys.exit(1)

    print(f'测试PDF文本提取服务...')
    print(f'文件: {pdf_path}\n')

    result = extract_text_from_pdf(pdf_path)

    print(f'提取方法: {result["method"]}')
    print(f'页数: {result["pages"]}')
    print(f'成功: {result["success"]}')
    print(f'文本长度: {len(result["text"])} 字符')

    if result['success']:
        print('\n=== 提取的文本（前500字符）===')
        print(result['text'][:500])
        print('\n=== 关键字段检测 ===')
        keywords = ['甲方', '乙方', '合同', '金额', '日期', '签订', '项目']
        for keyword in keywords:
            count = result['text'].count(keyword)
            print(f'"{keyword}" 出现次数: {count}')
    else:
        print(f'\n提取失败: {result.get("error", "未知错误")}')

if __name__ == '__main__':
    main()
