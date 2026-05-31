#!/usr/bin/env python3
"""创建测试PDF文件"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pathlib import Path

def create_test_pdf():
    output_path = Path(__file__).parent / 'test.pdf'

    c = canvas.Canvas(str(output_path), pagesize=A4)
    width, height = A4

    # 使用内置字体（支持基本拉丁字符）
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 100, "Contract Management Test PDF")

    c.setFont("Helvetica", 12)
    y = height - 150

    test_content = [
        "Contract Number: CM-2024-001",
        "Party A: ABC Company Ltd.",
        "Party B: XYZ Corporation",
        "Contract Amount: $100,000",
        "Signing Date: 2024-01-15",
        "Project Name: Software Development Services",
        "",
        "Terms and Conditions:",
        "1. Payment terms: Net 30 days",
        "2. Delivery timeline: 6 months",
        "3. Warranty period: 12 months",
        "4. Confidentiality agreement included",
        "",
        "This is a test document for PDF text extraction.",
        "The system should be able to extract all this text.",
    ]

    for line in test_content:
        c.drawString(100, y, line)
        y -= 20

    c.save()
    print(f'测试PDF已创建: {output_path}')

if __name__ == '__main__':
    create_test_pdf()
