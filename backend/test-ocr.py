#!/usr/bin/env python3
import sys
import os
from pdf2image import convert_from_path

pdf_path = '/Users/hadwinhuang/Desktop/盖章版-深圳美高梅酒店园林绿植养护项目合同.pdf'
out_dir = '/tmp/test-ocr'

os.makedirs(out_dir, exist_ok=True)

try:
    print(f'Converting PDF to images...')
    images = convert_from_path(pdf_path, dpi=300, first_page=1, last_page=2)
    print(f'Converted {len(images)} pages')

    for i, img in enumerate(images):
        img_path = os.path.join(out_dir, f'page_{i+1:04d}.png')
        img.save(img_path)
        print(f'Saved: {img_path}')

    print(f'\nImages saved to: {out_dir}')

except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
