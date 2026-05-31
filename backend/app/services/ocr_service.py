import subprocess
from PIL import Image
import os
from pathlib import Path
import logging
import tempfile
import shutil

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        self.tesseract_cmd = 'tesseract'

    def extract_text_from_image(self, image_path: str) -> str:
        """Extract text from an image using OCR"""
        try:
            logger.info(f"Extracting text from image: {image_path}")

            # Copy image to temp directory to avoid path issues
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
                tmp_path = tmp_file.name

            shutil.copy2(image_path, tmp_path)

            try:
                # Run tesseract with subprocess
                result = subprocess.run(
                    [self.tesseract_cmd, tmp_path, 'stdout', '-l', 'chi_sim+eng', '--psm', '1'],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    timeout=30
                )

                if result.returncode != 0:
                    logger.error(f"Tesseract error: {result.stderr}")
                    raise Exception(f"Tesseract failed with code {result.returncode}")

                text = result.stdout.strip()
                logger.info(f"Extracted {len(text)} characters from image")
                return text

            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)

        except Exception as e:
            logger.error(f"Error extracting text from image: {str(e)}")
            raise
