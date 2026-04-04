from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from typing import Dict, List, Tuple
import json
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from utils.ocr import get_extractor
from utils.parser import get_parser

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# File upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'tiff'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Create uploads directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Default grade to point mapping (can be customized)
DEFAULT_GRADING_SYSTEM = {
    "O": 10,
    "A+": 9,
    "A": 8,
    "B+": 7,
    "B": 6,
    "C": 5,
    "D": 4,
    "F": 0
}


# File upload helper
def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


class CGPACalculator:
    """Handles all CGPA calculation logic"""
    
    def __init__(self, grading_system: Dict = None):
        """Initialize calculator with grading system"""
        self.grading_system = grading_system or DEFAULT_GRADING_SYSTEM
    
    def calculate_sgpa(self, subjects: List[Dict]) -> Tuple[float, float]:
        """
        Calculate SGPA for a semester
        
        Args:
            subjects: List of subject dicts with 'credits', 'grade' keys
            
        Returns:
            Tuple of (SGPA, total_credits)
        """
        if not subjects:
            return 0.0, 0.0
        
        total_credit_points = 0
        total_credits = 0
        
        for subject in subjects:
            try:
                credits = float(subject.get('credits', 0))
                grade = subject.get('grade', 'F')
                
                # Validate grade
                if grade not in self.grading_system:
                    continue
                
                if credits <= 0:
                    continue
                
                grade_point = self.grading_system[grade]
                total_credit_points += credits * grade_point
                total_credits += credits
            except (ValueError, TypeError):
                continue
        
        if total_credits == 0:
            return 0.0, 0.0
        
        sgpa = total_credit_points / total_credits
        return round(sgpa, 2), total_credits
    
    def calculate_cgpa(self, semesters: List[Dict]) -> Tuple[float, float]:
        """
        Calculate overall CGPA across all semesters
        
        Args:
            semesters: List of semester dicts with 'subjects' key
            
        Returns:
            Tuple of (CGPA, total_credits)
        """
        if not semesters:
            return 0.0, 0.0
        
        total_credit_points = 0
        total_credits = 0
        
        for semester in semesters:
            subjects = semester.get('subjects', [])
            sgpa, sem_credits = self.calculate_sgpa(subjects)
            
            # Sum across all semesters
            total_credit_points += sgpa * sem_credits
            total_credits += sem_credits
        
        if total_credits == 0:
            return 0.0, 0.0
        
        cgpa = total_credit_points / total_credits
        return round(cgpa, 2), total_credits
    
    def calculate_required_grades(self, current_semesters: List[Dict], 
                                 target_cgpa: float, 
                                 future_courses: int,
                                 assumed_credits_per_course: float) -> Dict:
        """
        Calculate what grades are needed to reach target CGPA
        
        Args:
            current_semesters: List of completed semester data
            target_cgpa: Desired CGPA
            future_courses: Number of courses in future semesters
            assumed_credits_per_course: Credit per course
            
        Returns:
            Dict with analysis and required grades
        """
        current_cgpa, current_credits = self.calculate_cgpa(current_semesters)
        
        # Calculate total points needed
        future_credits = future_courses * assumed_credits_per_course
        total_future_credits = current_credits + future_credits
        
        total_points_needed = target_cgpa * total_future_credits
        current_points = current_cgpa * current_credits
        
        points_needed = total_points_needed - current_points
        
        # Calculate average grade points needed
        if future_credits > 0:
            avg_grade_points_needed = points_needed / future_credits
        else:
            avg_grade_points_needed = 0
        
        # Find equivalent grade
        equivalent_grade = self._find_closest_grade(avg_grade_points_needed)
        
        return {
            'current_cgpa': current_cgpa,
            'target_cgpa': target_cgpa,
            'achievable': avg_grade_points_needed <= 10,
            'avg_grade_points_needed': round(avg_grade_points_needed, 2),
            'equivalent_grade': equivalent_grade,
            'current_credits': current_credits,
            'future_credits': future_credits,
            'points_needed': round(points_needed, 2)
        }
    
    def _find_closest_grade(self, grade_points: float) -> str:
        """Find closest grade for given grade points"""
        if grade_points < 0:
            return "F"
        if grade_points > 10:
            return "O"
        
        closest_grade = "F"
        closest_diff = float('inf')
        
        for grade, points in self.grading_system.items():
            diff = abs(points - grade_points)
            if diff < closest_diff:
                closest_diff = diff
                closest_grade = grade
        
        return closest_grade
    
    def get_low_performing_subjects(self, semesters: List[Dict], 
                                   threshold_grade: str = "C") -> List[Dict]:
        """
        Identify subjects below threshold grade
        
        Args:
            semesters: All semester data
            threshold_grade: Grades below this are flagged
            
        Returns:
            List of low-performing subjects
        """
        threshold_points = self.grading_system.get(threshold_grade, 5)
        low_performers = []
        
        for sem_idx, semester in enumerate(semesters):
            for subject in semester.get('subjects', []):
                grade = subject.get('grade', 'F')
                grade_points = self.grading_system.get(grade, 0)
                
                if grade_points <= threshold_points:
                    low_performers.append({
                        'semester': sem_idx + 1,
                        'subject_name': subject.get('name', 'Unknown'),
                        'grade': grade,
                        'grade_points': grade_points,
                        'credits': subject.get('credits', 0)
                    })
        
        return low_performers


# Initialize calculator
calculator = CGPACalculator()


@app.route('/')
def index():
    """Serve main page"""
    return render_template('index.html', grading_system=json.dumps(DEFAULT_GRADING_SYSTEM))


@app.route('/api/calculate', methods=['POST'])
def calculate():
    """
    Calculate SGPA/CGPA
    
    Expects JSON:
    {
        "semesters": [
            {
                "subjects": [
                    {"name": "Math", "credits": 4, "grade": "A+"},
                    ...
                ]
            },
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        semesters = data.get('semesters', [])
        
        if not semesters:
            return jsonify({'error': 'No semesters provided'}), 400
        
        results = []
        total_cgpa, total_credits = 0, 0
        
        # Calculate SGPA for each semester
        for semester in semesters:
            subjects = semester.get('subjects', [])
            sgpa, credits = calculator.calculate_sgpa(subjects)
            results.append({
                'semester': len(results) + 1,
                'sgpa': sgpa,
                'credits': credits,
                'subjects_count': len(subjects)
            })
        
        # Calculate overall CGPA
        cgpa, total_credits = calculator.calculate_cgpa(semesters)
        
        return jsonify({
            'success': True,
            'semesters': results,
            'cgpa': cgpa,
            'total_credits': total_credits
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/target-cgpa', methods=['POST'])
def target_cgpa():
    """
    Calculate what grades needed to reach target CGPA
    
    Expects JSON:
    {
        "semesters": [...],
        "target_cgpa": 8.5,
        "future_courses": 10,
        "credits_per_course": 3
    }
    """
    try:
        data = request.get_json()
        semesters = data.get('semesters', [])
        target_cgpa = float(data.get('target_cgpa', 8.0))
        future_courses = int(data.get('future_courses', 8))
        credits_per_course = float(data.get('credits_per_course', 3))
        
        if not 0 <= target_cgpa <= 10:
            return jsonify({'error': 'Target CGPA must be between 0 and 10'}), 400
        
        analysis = calculator.calculate_required_grades(
            semesters, 
            target_cgpa,
            future_courses,
            credits_per_course
        )
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/low-performers', methods=['POST'])
def low_performers():
    """
    Get low-performing subjects
    
    Expects JSON:
    {
        "semesters": [...],
        "threshold_grade": "C"
    }
    """
    try:
        data = request.get_json()
        semesters = data.get('semesters', [])
        threshold = data.get('threshold_grade', 'C')
        
        low_performers = calculator.get_low_performing_subjects(semesters, threshold)
        
        return jsonify({
            'success': True,
            'low_performers': low_performers
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/grading-system', methods=['GET', 'POST'])
def grading_system():
    """Get or set custom grading system"""
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'grading_system': calculator.grading_system
        })
    
    # POST: Update grading system
    try:
        data = request.get_json()
        new_system = data.get('grading_system', {})
        
        if not new_system:
            return jsonify({'error': 'Grading system cannot be empty'}), 400
        
        # Validate that all values are numeric
        for grade, points in new_system.items():
            try:
                float(points)
            except (ValueError, TypeError):
                return jsonify({'error': f'Invalid points for grade {grade}'}), 400
        
        calculator.grading_system = new_system
        
        return jsonify({
            'success': True,
            'message': 'Grading system updated',
            'grading_system': calculator.grading_system
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export', methods=['POST'])
def export_data():
    """Export calculation data as JSON"""
    try:
        data = request.get_json()
        export_data = {
            'exported_at': datetime.now().isoformat(),
            'semesters': data.get('semesters', []),
            'grading_system': calculator.grading_system
        }
        
        return jsonify({
            'success': True,
            'data': export_data
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/upload', methods=['POST'])
def upload_file():
    """
    Upload and extract data from marksheet document
    
    Expects multipart form data with 'file' field
    """
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file
        if not allowed_file(file.filename):
            return jsonify({
                'error': f'Unsupported file type. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Save file
        try:
            filename = secure_filename(file.filename)
            # Add timestamp to avoid conflicts
            from time import time
            filename = f"{int(time())}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
        except Exception as e:
            return jsonify({'error': f'Error saving file: {str(e)}'}), 500
        
        # Extract text
        extractor = get_extractor()
        extracted_text, extract_error = extractor.extract_text(filepath)
        
        if extract_error:
            # Clean up file
            try:
                os.remove(filepath)
            except:
                pass
            return jsonify({'error': extract_error}), 400
        
        # Parse data
        parser = get_parser()
        parsed_data = parser.parse_marksheet(extracted_text)
        
        # Clean up file
        try:
            os.remove(filepath)
        except:
            pass
        
        return jsonify({
            'success': True,
            'data': {
                'subjects': parsed_data['subjects'],
                'total_found': parsed_data['total_found'],
                'low_confidence': parsed_data['low_confidence'],
                'errors': parsed_data['errors'],
                'has_raw_text': True
            }
        })
    
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500


@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    """
    Get raw extracted text from a previous upload
    
    Used for debugging/manual review
    """
    try:
        data = request.get_json()
        raw_text = data.get('raw_text', '')
        
        if not raw_text:
            return jsonify({'error': 'No raw text provided'}), 400
        
        # Just return the raw text for display
        return jsonify({
            'success': True,
            'raw_text': raw_text
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/validate-extracted-subjects', methods=['POST'])
def validate_extracted_subjects():
    """
    Validate and potentially correct extracted subject data
    
    Expects JSON:
    {
        "subjects": [
            {"name": "Math", "credits": 4, "grade": "A+"},
            ...
        ]
    }
    """
    try:
        data = request.get_json()
        subjects = data.get('subjects', [])
        
        if not subjects:
            return jsonify({'error': 'No subjects provided'}), 400
        
        validated = []
        errors = []
        
        for idx, subject in enumerate(subjects):
            name = subject.get('name', '').strip()
            credits_val = subject.get('credits')
            grade = subject.get('grade', '').strip()
            
            # Validate name
            if not name:
                errors.append(f"Subject {idx + 1}: Name is empty")
                continue
            
            # Validate credits
            try:
                credits = float(credits_val)
                if credits <= 0:
                    errors.append(f"Subject {idx + 1}: Credits must be positive")
                    continue
            except (ValueError, TypeError):
                errors.append(f"Subject {idx + 1}: Invalid credits value")
                continue
            
            # Validate grade
            if grade not in calculator.grading_system:
                errors.append(f"Subject {idx + 1}: Grade '{grade}' not recognized")
                continue
            
            validated.append({
                'name': name,
                'credits': credits,
                'grade': grade
            })
        
        return jsonify({
            'success': len(errors) == 0 or len(validated) > 0,
            'validated_subjects': validated,
            'errors': errors,
            'valid_count': len(validated),
            'error_count': len(errors)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
