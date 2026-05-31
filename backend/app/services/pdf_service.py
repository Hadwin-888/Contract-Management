import PyPDF2
import pdfplumber
from pathlib import Path
from typing import Dict, Any
import logging
from pdf2image import convert_from_path
import tempfile
import os
from .ocr_service import OCRService

logger = logging.getLogger(__name__)
ocr_service = OCRService()

def extract_text_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """
    从PDF提取文本，优先使用PyPDF2，如果失败则使用pdfplumber

    Args:
        pdf_path: PDF文件路径

    Returns:
        包含提取文本和元数据的字典
    """
    result = {
        'text': '',
        'pages': 0,
        'method': 'pypdf2',
        'success': False
    }

    try:
        # 尝试使用PyPDF2提取
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            result['pages'] = len(pdf_reader.pages)

            text_parts = []
            for page in pdf_reader.pages:
                text_parts.append(page.extract_text())

            result['text'] = '\n'.join(text_parts)

            # 检查提取的文本是否有效（至少50个字符）
            if len(result['text'].strip()) < 50:
                logger.warning(f'PyPDF2提取文本过少({len(result["text"])}字符)，切换到pdfplumber')
                result = extract_text_with_pdfplumber(pdf_path)

                # 如果pdfplumber也失败，尝试OCR
                if not result['success'] or len(result['text'].strip()) < 50:
                    logger.warning('pdfplumber提取失败或文本过少，尝试OCR')
                    result = extract_text_with_ocr(pdf_path)
            else:
                result['success'] = True
                logger.info(f'PyPDF2成功提取 {len(result["text"])} 字符')

    except Exception as e:
        logger.error(f'PyPDF2提取失败: {e}，切换到pdfplumber')
        result = extract_text_with_pdfplumber(pdf_path)

        # 如果pdfplumber也失败，尝试OCR
        if not result['success'] or len(result['text'].strip()) < 50:
            logger.warning('pdfplumber提取失败或文本过少，尝试OCR')
            result = extract_text_with_ocr(pdf_path)

    return result

def extract_text_with_pdfplumber(pdf_path: str) -> Dict[str, Any]:
    """
    使用pdfplumber从PDF提取文本

    Args:
        pdf_path: PDF文件路径

    Returns:
        包含提取文本和元数据的字典
    """
    result = {
        'text': '',
        'pages': 0,
        'method': 'pdfplumber',
        'success': False
    }

    try:
        logger.info('开始pdfplumber提取...')

        with pdfplumber.open(pdf_path) as pdf:
            result['pages'] = len(pdf.pages)
            logger.info(f'PDF共 {len(pdf.pages)} 页')

            text_parts = []
            for i, page in enumerate(pdf.pages):
                logger.info(f'处理第 {i+1}/{len(pdf.pages)} 页')
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

            result['text'] = '\n\n'.join(text_parts)
            result['success'] = True
            logger.info(f'pdfplumber成功提取 {len(result["text"])} 字符')

    except Exception as e:
        logger.error(f'pdfplumber提取失败: {e}')
        result['error'] = str(e)

    return result

def extract_text_with_ocr(pdf_path: str) -> Dict[str, Any]:
    """
    使用OCR从PDF提取文本（用于扫描版PDF）

    Args:
        pdf_path: PDF文件路径

    Returns:
        包含提取文本和元数据的字典
    """
    result = {
        'text': '',
        'pages': 0,
        'method': 'ocr',
        'success': False
    }

    temp_dir = None
    try:
        logger.info('开始OCR提取...')

        # 创建临时目录存储图像
        temp_dir = tempfile.mkdtemp()

        # 将PDF转换为图像
        images = convert_from_path(pdf_path, dpi=300)
        result['pages'] = len(images)
        logger.info(f'PDF转换为 {len(images)} 张图像')

        text_parts = []
        for i, image in enumerate(images):
            logger.info(f'OCR处理第 {i+1}/{len(images)} 页')

            # 保存图像到临时文件
            image_path = os.path.join(temp_dir, f'page_{i+1}.png')
            image.save(image_path, 'PNG')

            # 使用OCR提取文本
            page_text = ocr_service.extract_text_from_image(image_path)
            if page_text:
                text_parts.append(page_text)

            # 删除临时图像文件
            os.unlink(image_path)

        result['text'] = '\n\n'.join(text_parts)
        result['success'] = True
        logger.info(f'OCR成功提取 {len(result["text"])} 字符')

    except Exception as e:
        logger.error(f'OCR提取失败: {e}')
        result['error'] = str(e)

    finally:
        # 清理临时目录
        if temp_dir and os.path.exists(temp_dir):
            try:
                os.rmdir(temp_dir)
            except:
                pass

    return result
