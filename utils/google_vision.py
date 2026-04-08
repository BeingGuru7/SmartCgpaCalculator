"""
Google Cloud Vision API integration for OCR
"""

import os
import json
import base64

# Google Cloud Vision is optional - import gracefully handles missing package
try:
    from google.cloud import vision
    from google.oauth2 import service_account
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    GOOGLE_VISION_AVAILABLE = False
    vision = None


class GoogleVisionOCR:
    """Extract text from images using Google Cloud Vision API"""
    
    def __init__(self, api_key: str = None):
        """Initialize with API key from environment or parameter"""
        self.api_key = api_key or os.getenv('GOOGLE_API_KEY')
        self.client = None
        
        if self.api_key:
            self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Vision API client"""
        if not GOOGLE_VISION_AVAILABLE:
            print("Warning: google-cloud-vision package not installed. Using browser OCR fallback.")
            self.client = None
            return
            
        try:
            # Create a client using the API key
            self.client = vision.ImageAnnotatorClient(
                client_options={
                    'api_key': self.api_key
                }
            )
        except Exception as e:
            print(f"Error initializing Vision API: {e}")
            self.client = None
    
    def extract_text_from_image(self, image_path: str) -> tuple:
        """
        Extract text from image using Google Vision API
        
        Args:
            image_path: Path to image file
            
        Returns:
            Tuple of (extracted_text, error_message)
        """
        if not self.client:
            return None, "Google Vision API not initialized. Check API key."
        
        try:
            # Read image file
            with open(image_path, 'rb') as image_file:
                content = image_file.read()
            
            # Create image object
            image = vision.Image(content=content)
            
            # Perform OCR
            response = self.client.document_text_detection(image=image)
            
            if response.error.message:
                return None, f"Vision API error: {response.error.message}"
            
            # Extract full text
            full_text = ""
            for page in response.full_text_annotation.pages:
                for block in page.blocks:
                    for paragraph in block.paragraphs:
                        for word in paragraph.words:
                            for symbol in word.symbols:
                                full_text += symbol.text
                            full_text += ' '
                        full_text += '\n'
            
            if not full_text or full_text.strip() == "":
                return None, "No text could be extracted from the image"
            
            return full_text, None
            
        except FileNotFoundError:
            return None, f"Image file not found: {image_path}"
        except Exception as e:
            return None, f"Error extracting text: {str(e)}"
    
    def extract_text_from_base64(self, base64_string: str) -> tuple:
        """
        Extract text from base64 encoded image
        
        Args:
            base64_string: Base64 encoded image data
            
        Returns:
            Tuple of (extracted_text, error_message)
        """
        if not self.client:
            return None, "Google Vision API not initialized. Check API key."
        
        try:
            # Decode base64 if it includes the data URI prefix
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode to bytes
            image_bytes = base64.b64decode(base64_string)
            
            # Create image object
            image = vision.Image(content=image_bytes)
            
            # Perform OCR
            response = self.client.document_text_detection(image=image)
            
            if response.error.message:
                return None, f"Vision API error: {response.error.message}"
            
            # Extract full text
            full_text = ""
            for page in response.full_text_annotation.pages:
                for block in page.blocks:
                    for paragraph in block.paragraphs:
                        for word in paragraph.words:
                            for symbol in word.symbols:
                                full_text += symbol.text
                            full_text += ' '
                        full_text += '\n'
            
            if not full_text or full_text.strip() == "":
                return None, "No text could be extracted from the image"
            
            return full_text, None
            
        except Exception as e:
            return None, f"Error extracting text: {str(e)}"


# Singleton instance
_ocr = None

def get_google_vision_ocr():
    """Get or create Google Vision OCR instance"""
    global _ocr
    if _ocr is None:
        _ocr = GoogleVisionOCR()
    return _ocr
