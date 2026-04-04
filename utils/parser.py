"""
Data extraction and parsing from marksheet text

Identifies subjects, credits, and grades from extracted text
"""

import re
from typing import List, Dict, Tuple
from dataclasses import dataclass


@dataclass
class ExtractedSubject:
    """Represents an extracted subject entry"""
    name: str
    credits: float
    grade: str
    confidence: float = 0.8  # 0-1 scale
    needs_review: bool = False
    raw_text: str = ""


class MarksheetParser:
    """Parse marksheet data from extracted text"""
    
    # Common grade patterns (including variations)
    GRADE_PATTERNS = {
        'O': [r'\bO\b', r'\b10\b'],
        'A+': [r'A\+', r'A Plus', r'9\+'],
        'A': [r'\bA\b(?!\+)', r'\b8\b(?!\+)'],
        'B+': [r'B\+', r'B Plus', r'7\+'],
        'B': [r'\bB\b(?!\+)', r'\b6\b'],
        'C': [r'\bC\b', r'\b5\b'],
        'D': [r'\bD\b', r'\b4\b'],
        'F': [r'\bF\b(?!I)', r'\bFail\b', r'\b0\b(?!\.)'],
    }
    
    # Credit patterns
    CREDIT_PATTERNS = [
        r'(\d+\.?\d*)\s*(?:credit|cr|cred|hrs)',  # "4 credits"
        r'credit[s]?[:=\s]*(\d+\.?\d*)',           # "credits: 4"
        r'(\d+\.?\d*)\s*credits?',                 # "4 credits"
    ]
    
    def __init__(self):
        """Initialize parser"""
        self.compiled_grades = {}
        self.compile_patterns()
    
    def compile_patterns(self):
        """Compile regex patterns for faster matching"""
        for grade, patterns in self.GRADE_PATTERNS.items():
            self.compiled_grades[grade] = [re.compile(p, re.IGNORECASE) for p in patterns]
    
    def extract_grade(self, text: str) -> Tuple[str, float]:
        """
        Extract grade from text
        
        Args:
            text: Text containing grade
            
        Returns:
            Tuple of (grade, confidence)
        """
        text_clean = text.strip().upper()
        
        # Exact matches (high confidence)
        if text_clean in self.GRADE_PATTERNS:
            return text_clean, 1.0
        
        # Pattern matching (medium confidence)
        for grade, patterns in self.compiled_grades.items():
            for pattern in patterns:
                if pattern.search(text):
                    return grade, 0.8
        
        # Fuzzy matching for common OCR errors (low confidence)
        error_corrections = {
            '0': 'O',
            '8+': 'A+',
            '7+': 'B+',
            'O+': 'A+',
            'OO': 'O',
        }
        
        if text_clean in error_corrections:
            return error_corrections[text_clean], 0.5
        
        return None, 0.0
    
    def extract_credits(self, text: str) -> Tuple[float, float]:
        """
        Extract credits from text
        
        Args:
            text: Text containing credits
            
        Returns:
            Tuple of (credits, confidence)
        """
        text_lower = text.lower().strip()
        
        # Try different patterns
        for pattern in self.CREDIT_PATTERNS:
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                try:
                    credits = float(match.group(1))
                    if 0 < credits <= 10:  # Reasonable credit range
                        return credits, 0.9
                except (ValueError, IndexError):
                    continue
        
        # Try extracting standalone numbers
        numbers = re.findall(r'\d+\.?\d*', text)
        for num_str in numbers:
            try:
                num = float(num_str)
                if 0 < num <= 10:
                    return num, 0.6  # Lower confidence
            except ValueError:
                continue
        
        return None, 0.0
    
    def find_subject_rows(self, text: str) -> List[str]:
        """
        Find likely subject rows from text
        
        Assumes text has some structure (tabs, spaces, newlines)
        
        Args:
            text: Extracted text from document
            
        Returns:
            List of potential subject rows
        """
        lines = text.split('\n')
        rows = []
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Skip headers/footers (lines with too many caps or special chars)
            if len(line) > 100 or line.count('=') > 5:
                continue
            
            # Skip lines that are all numbers
            if re.match(r'^\d+[\s\d.]*$', line):
                continue
            
            # Check if line contains subject-like content
            # Should have letters (subject name) and potentially a grade/credit
            words = line.split()
            if len(words) >= 2 and any(word.isalpha() for word in words):
                rows.append(line)
        
        return rows
    
    def parse_row(self, row: str) -> Tuple[ExtractedSubject, bool]:
        """
        Parse a single row into subject data
        
        Args:
            row: Single row text
            
        Returns:
            Tuple of (ExtractedSubject, is_valid)
        """
        # Split row into parts
        parts = re.split(r'[\t,;|]\s*', row)
        
        subject_name = None
        credits = None
        grade = None
        credits_conf = 0.0
        grade_conf = 0.0
        needs_review = False
        
        # Try to identify components
        for part in parts:
            part = part.strip()
            if not part:
                continue
            
            # Check for grade
            if not grade:
                g, g_conf = self.extract_grade(part)
                if g:
                    grade = g
                    grade_conf = g_conf
                    continue
            
            # Check for credits
            if not credits:
                c, c_conf = self.extract_credits(part)
                if c:
                    credits = c
                    credits_conf = c_conf
                    continue
            
            # Otherwise, assume it's subject name
            if not subject_name:
                subject_name = part
        
        # Validate extracted data
        is_valid = subject_name and credits and grade
        
        if not is_valid:
            return None, False
        
        # Calculate overall confidence
        avg_confidence = (grade_conf + credits_conf) / 2
        
        # Mark for review if low confidence
        if avg_confidence < 0.7 or grade_conf < 0.6:
            needs_review = True
        
        return ExtractedSubject(
            name=subject_name,
            credits=credits,
            grade=grade,
            confidence=avg_confidence,
            needs_review=needs_review,
            raw_text=row
        ), True
    
    def parse_marksheet(self, text: str, confidence_threshold: float = 0.5) -> Dict:
        """
        Parse complete marksheet text
        
        Args:
            text: Extracted text from document
            confidence_threshold: Minimum confidence to include (0-1)
            
        Returns:
            Dict with:
                - subjects: List of ExtractedSubject
                - total_found: Number of subjects found
                - low_confidence: Number marked for review
                - errors: List of error messages
        """
        errors = []
        subjects = []
        low_confidence_count = 0
        
        if not text or not text.strip():
            return {
                'subjects': [],
                'total_found': 0,
                'low_confidence': 0,
                'errors': ['No text provided']
            }
        
        # Find potential subject rows
        rows = self.find_subject_rows(text)
        
        if not rows:
            return {
                'subjects': [],
                'total_found': 0,
                'low_confidence': 0,
                'errors': ['Could not identify subject rows. Document format may not be supported.']
            }
        
        # Parse each row
        for row in rows:
            subject, is_valid = self.parse_row(row)
            
            if is_valid:
                if subject.confidence < confidence_threshold:
                    low_confidence_count += 1
                
                subjects.append({
                    'name': subject.name,
                    'credits': subject.credits,
                    'grade': subject.grade,
                    'confidence': round(subject.confidence, 2),
                    'needs_review': subject.needs_review,
                    'raw_text': subject.raw_text
                })
        
        if not subjects:
            errors.append('No valid subject entries could be extracted')
        
        return {
            'subjects': subjects,
            'total_found': len(subjects),
            'low_confidence': low_confidence_count,
            'errors': errors,
            'raw_text': text
        }


# Singleton instance
_parser = None

def get_parser():
    """Get or create parser instance"""
    global _parser
    if _parser is None:
        _parser = MarksheetParser()
    return _parser
