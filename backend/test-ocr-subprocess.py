#!/usr/bin/env python3
import sys
import os
import subprocess

# Test images directory
img_dir = '/tmp/test-ocr'
img_path = os.path.join(img_dir, 'page_0001.png')

if not os.path.exists(img_path):
    print(f'Error: Image not found at {img_path}', file=sys.stderr)
    sys.exit(1)

try:
    print(f'Running tesseract on: {img_path}')

    # Run tesseract directly
    result = subprocess.run(
        ['tesseract', img_path, 'stdout', '-l', 'chi_sim'],
        capture_output=True,
        text=True,
        encoding='utf-8',
        errors='ignore'  # Ignore encoding errors
    )

    if result.returncode != 0:
        print(f'Tesseract error (code {result.returncode}):', file=sys.stderr)
        print(result.stderr, file=sys.stderr)

    text = result.stdout

    print('\n=== OCR Result ===')
    print(text)
    print('\n=== End of Result ===')

    print(f'\nExtracted {len(text)} characters')
    print(f'Return code: {result.returncode}')

except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
