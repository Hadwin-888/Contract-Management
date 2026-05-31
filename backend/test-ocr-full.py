#!/usr/bin/env python3
import sys
import os
import pytesseract
from PIL import Image

# Test images directory
img_dir = '/tmp/test-ocr'

# Test OCR on first page
img_path = os.path.join(img_dir, 'page_0001.png')

if not os.path.exists(img_path):
    print(f'Error: Image not found at {img_path}', file=sys.stderr)
    sys.exit(1)

try:
    print(f'Loading image: {img_path}')
    img = Image.open(img_path)
    print(f'Image size: {img.size}')

    print('\nPerforming OCR with chi_sim...')
    text = pytesseract.image_to_string(img, lang='chi_sim')

    print('\n=== OCR Result ===')
    print(text)
    print('\n=== End of Result ===')

    print(f'\nExtracted {len(text)} characters')

except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
