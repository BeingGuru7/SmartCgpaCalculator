"""
OCR and text extraction utilities for marksheets

Handles text extraction from PDF and image files with preprocessing
"""

import os
import cv2
import numpy as np
import pytesseract
from PIL import Image
import pdfplumber
from pathlib import Path


class TextExtractor:
    """Extract text from PDF and image files"""
    
    def __init__(self):
        """Initialize extractor"""
        self.supported_formats = {'.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff'}
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, filepath: str) -> tuple:
        """
        Validate uploaded file
        
        Args:
            filepath: Path to uploaded file
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check if file exists
        if not os.path.exists(filepath):
            return False, "File not found"
        
        # Check file extension
        ext = Path(filepath).suffix.lower()
        if ext not in self.supported_formats:
            return False, f"Unsupported format. Supported: {', '.join(self.supported_formats)}"
        
        # Check file size
        file_size = os.path.getsize(filepath)
        if file_size > self.max_file_size:
            return False, f"File too large. Maximum: 10MB"
        
        if file_size == 0:
            return False, "File is empty"
        
        return True, None
    
    def extract_from_pdf(self, filepath: str) -> tuple:
        """
        Extract text from PDF file
        
        Args:
            filepath: Path to PDF file
            
        Returns:
            Tuple of (extracted_text, error_message)
        """
        try:
            all_text = []
            
            with pdfplumber.open(filepath) as pdf:
                if len(pdf.pages) == 0:
                    return None, "PDF is empty"
                
                # Extract text from all pages
                for page_num, page in enumerate(pdf.pages):
                    try:
                        text = page.extract_text()
                        if text:
                            all_text.append(f"--- Page {page_num + 1} ---\n{text}")
                    except Exception as e:
                        print(f"Warning: Error extracting page {page_num + 1}: {e}")
                        continue
            
            if not all_text:
                return None, "No text found in PDF. The PDF may contain only images."
            
            extracted_text = "\n\n".join(all_text)
            return extracted_text, None
            
        except Exception as e:
            error_str = str(e)
            if 'permission' in error_str.lower():
                return None, "Cannot read PDF - it may be password protected or corrupted."
            return None, f"Error: {error_str[:80]}"
    
    def preprocess_image(self, image_path: str) -> tuple:
        """
        Preprocess image for better OCR results
        
        Args:
            image_path: Path to image file
            
        Returns:
            Tuple of (preprocessed_image, error_message)
        """
        try:
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                return None, "Failed to load image"
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply noise reduction
            denoised = cv2.fastNlMeansDenoising(gray, h=10)
            
            # Apply thresholding for better contrast
            _, thresh = cv2.threshold(denoised, 150, 255, cv2.THRESH_BINARY)
            
            # Apply morphological operations to clean up
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            
            # Upscale if image is small (improves OCR)
            height, width = cleaned.shape
            if width < 300:
                scale_factor = 300 / width
                new_width = int(width * scale_factor)
                new_height = int(height * scale_factor)
                cleaned = cv2.resize(cleaned, (new_width, new_height), 
                                   interpolation=cv2.INTER_CUBIC)
            
            return cleaned, None
            
        except Exception as e:
            return None, f"Error preprocessing image: {str(e)}"
    
    def extract_from_image(self, filepath: str, preprocess: bool = True) -> tuple:
        """
        Extract text from image file using OCR
        
        Args:
            filepath: Path to image file
            preprocess: Whether to preprocess image before OCR
            
        Returns:
            Tuple of (extracted_text, error_message)
        """
        try:
            if preprocess:
                # Preprocess image
                processed_img, error = self.preprocess_image(filepath)
                if error:
                    return None, error
                
                # Convert numpy array to PIL Image for pytesseract
                pil_image = Image.fromarray(processed_img)
            else:
                # Use original image
                pil_image = Image.open(filepath)
            
            # Extract text using pytesseract
            text = pytesseract.image_to_string(pil_image, lang='eng')
            
            if not text or text.strip() == "":
                return None, "No text could be extracted from image. Try a clearer image."
            
            return text, None
            
        except pytesseract.TesseractNotFoundError:
            return None, "❌ Tesseract-OCR is not installed. See README.md for installation instructions."
        except Exception as e:
            error_msg = str(e).lower()
            if 'tesseract' in error_msg or 'path' in error_msg:
                return None, "❌ Tesseract-OCR not found. Install from: https://github.com/UB-Mannheim/tesseract/wiki"
            return None, f"Error extracting from image: {str(e)}"
    
    def extract_text(self, filepath: str) -> tuple:
        """
        Extract text from any supported file format
        
        Args:
            filepath: Path to file
            
        Returns:
            Tuple of (extracted_text, error_message)
        """
        # Validate file
        is_valid, error = self.validate_file(filepath)
        if not is_valid:
            return None, error
        
        # Determine file type and extract
        ext = Path(filepath).suffix.lower()
        
        if ext == '.pdf':
            return self.extract_from_pdf(filepath)
        else:
            # Image file
            return self.extract_from_image(filepath, preprocess=True)


# Singleton instance
_extractor = None

def get_extractor():
    """Get or create extractor instance"""
    global _extractor
    if _extractor is None:
        _extractor = TextExtractor()
    return _extractor
