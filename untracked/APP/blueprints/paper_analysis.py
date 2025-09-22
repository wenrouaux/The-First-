"""
Paper Analysis Blueprint - Flask Blueprint for analyzing research papers using Deepseek AI
"""

from flask import Blueprint, render_template, request, jsonify
import requests
import json
import os
import tempfile
from werkzeug.utils import secure_filename

# Create blueprint
paper_analysis_bp = Blueprint('paper_analysis', __name__, url_prefix='/paper-analysis')

@paper_analysis_bp.route('/')
def paper_analysis():
    """Paper analysis page"""
    return render_template('paper_analysis.html')

@paper_analysis_bp.route('/api/test-deepseek', methods=['POST'])
def test_deepseek():
    """Test Deepseek API connection"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'error': 'API key is required'}), 401

        # Test API with a simple prompt
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

        test_response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',  # Using chat completions endpoint
            headers=headers,
            json={
                'model': 'deepseek-chat',
                'messages': [
                    {'role': 'user', 'content': 'Say hello'}
                ],
                'max_tokens': 10
            },
            timeout=10
        )

        if test_response.ok:
            return jsonify({
                'success': True,
                'message': 'Deepseek API connection successful',
                'response': test_response.json()
            })
        else:
            return jsonify({
                'success': False,
                'error': f'API Error: {test_response.status_code}',
                'details': test_response.text
            }), test_response.status_code

    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': 'Connection error',
            'details': str(e)
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Unexpected error',
            'details': str(e)
        }), 500

@paper_analysis_bp.route('/api/analyze-paper', methods=['POST'])
def analyze_paper():
    """Analyze paper using Deepseek API"""
    try:
        # Get API key from header
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'error': 'API key is required'}), 401

        # Get analysis options
        extract_keywords = request.form.get('extract_keywords') == 'true'
        generate_summary = request.form.get('generate_summary') == 'true'
        find_related = request.form.get('find_related') == 'true'

        # Get uploaded file
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Check file size (limit to 50MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > 50 * 1024 * 1024:  # 50MB limit
            return jsonify({'error': 'File too large. Maximum size is 50MB'}), 400
        
        if file_size == 0:
            return jsonify({'error': 'File is empty'}), 400

        # Save file temporarily
        filename = secure_filename(file.filename)
        print(f"Processing file: {filename} (size: {file_size} bytes)")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
            file.save(temp_file.name)
            file_path = temp_file.name

        try:
            # Initialize results dictionary
            results = {
                'keywords': [],
                'summary': '',
                'related_works': []
            }

            # Extract text from file
            text = extract_text_from_file(file_path, filename)
            
            if not text or not text.strip():
                return jsonify({'error': 'Could not extract text from the file. The file might be empty or in an unsupported format.'}), 400

            # Clean up text
            text = text.strip()
            print(f"Final text length before truncation: {len(text)}")
            
            # Check if we have enough text
            if len(text) < 100:
                return jsonify({
                    'error': 'Extracted text is too short. This might be a scanned PDF without OCR text. Please ensure your PDF contains selectable text, not just images.'
                }), 400
            
            # Handle large documents
            text = process_large_document(text)

            # Call Deepseek API for each requested analysis
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }

            if extract_keywords:
                results['keywords'] = extract_keywords_with_deepseek(text, headers)

            if generate_summary:
                results['summary'] = generate_summary_with_deepseek(text, headers)

            if find_related:
                results['related_works'] = extract_formulas_with_deepseek(text, headers)

            return jsonify(results)

        finally:
            # Clean up temporary file
            try:
                os.unlink(file_path)
            except Exception as e:
                print(f"Error deleting temporary file: {str(e)}")

    except Exception as e:
        print(f"Analyze paper error: {str(e)}")
        return jsonify({'error': str(e)}), 500

def extract_text_from_file(file_path, filename):
    """Extract text from various file formats"""
    text = ''
    file_ext = os.path.splitext(filename)[1].lower()
    
    try:
        if file_ext == '.pdf':
            text = extract_pdf_text(file_path)
        elif file_ext in ['.docx', '.doc']:
            text = extract_word_text(file_path, file_ext)
        elif file_ext == '.rtf':
            text = extract_rtf_text(file_path)
        elif file_ext in ['.tex', '.latex']:
            text = extract_latex_text(file_path)
        elif file_ext in ['.md', '.markdown']:
            text = extract_markdown_text(file_path)
        else:
            text = extract_plain_text(file_path)
            
    except Exception as e:
        print(f"File processing error: {str(e)}")
        raise Exception(f"Error reading file: {str(e)}")
    
    return text

def extract_pdf_text(file_path):
    """Extract text from PDF files"""
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(file_path)
        text = ''
        num_pages = len(reader.pages)
        print(f"PDF has {num_pages} pages")
        
        for i, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + '\n'
                print(f"Extracted page {i+1}/{num_pages}")
            except Exception as page_error:
                print(f"Error extracting page {i+1}: {str(page_error)}")
                continue
                
        print(f"Total extracted text length: {len(text)}")
        return text
        
    except ImportError:
        # Try alternative PDF library
        try:
            import pdfplumber
            text = ''
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + '\n'
            return text
        except ImportError:
            raise Exception('PDF processing is not available. Please install PyPDF2 or pdfplumber.')
    except Exception as pdf_error:
        print(f"PDF extraction error: {str(pdf_error)}")
        # Try PyMuPDF as fallback
        try:
            import fitz  # PyMuPDF
            pdf_document = fitz.open(file_path)
            text = ''
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                text += page.get_text() + '\n'
            pdf_document.close()
            return text
        except ImportError:
            raise Exception(f'Could not extract text from PDF: {str(pdf_error)}. Try installing PyMuPDF.')
        except Exception as mupdf_error:
            raise Exception(f'PDF extraction failed: {str(pdf_error)}')

def extract_word_text(file_path, file_ext):
    """Extract text from Word documents"""
    try:
        if file_ext == '.docx':
            from docx import Document
            doc = Document(file_path)
            return '\n'.join([paragraph.text for paragraph in doc.paragraphs])
        else:
            # .doc files
            try:
                import docx2txt
                return docx2txt.process(file_path)
            except ImportError:
                raise Exception('DOC file support requires docx2txt. Please install it with: pip install docx2txt')
    except ImportError:
        raise Exception('Word document support requires python-docx. Please install it with: pip install python-docx')
    except Exception as docx_error:
        raise Exception(f'Error reading Word document: {str(docx_error)}')

def extract_rtf_text(file_path):
    """Extract text from RTF files"""
    try:
        import striprtf
        with open(file_path, 'r', encoding='utf-8') as f:
            rtf_content = f.read()
        return striprtf.rtf_to_text(rtf_content)
    except ImportError:
        raise Exception('RTF support requires striprtf. Please install it with: pip install striprtf')
    except Exception as rtf_error:
        raise Exception(f'Error reading RTF file: {str(rtf_error)}')

def extract_latex_text(file_path):
    """Extract text from LaTeX files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tex_content = f.read()
        # Basic LaTeX cleanup - remove common commands
        import re
        text = tex_content
        # Remove comments
        text = re.sub(r'%.*$', '', text, flags=re.MULTILINE)
        # Remove common LaTeX commands but keep content
        text = re.sub(r'\\(begin|end)\{[^}]+\}', '', text)
        text = re.sub(r'\\[a-zA-Z]+\*?\{([^}]+)\}', r'\1', text)
        text = re.sub(r'\\[a-zA-Z]+\*?', '', text)
        return text
    except Exception as tex_error:
        raise Exception(f'Error reading LaTeX file: {str(tex_error)}')

def extract_markdown_text(file_path):
    """Extract text from Markdown files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        # Clean up markdown syntax
        import re
        # Remove image links
        text = re.sub(r'!\[[^\]]*\]\([^)]+\)', '', text)
        # Convert links to just text
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        return text
    except Exception as md_error:
        raise Exception(f'Error reading Markdown file: {str(md_error)}')

def extract_plain_text(file_path):
    """Extract text from plain text files"""
    encodings = ['utf-8', 'utf-16', 'gbk', 'gb2312', 'big5', 'latin-1']
    text = None
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                text = f.read()
                print(f"Successfully read file with {encoding} encoding")
                break
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Error reading with {encoding}: {str(e)}")
            continue
    
    if text is None:
        # Try reading as binary and decode
        with open(file_path, 'rb') as f:
            binary_content = f.read()
            try:
                text = binary_content.decode('utf-8', errors='ignore')
            except:
                text = str(binary_content)
    
    return text

def process_large_document(text):
    """Process large documents by prioritizing formula extraction"""
    if len(text) > 98000:
        print("Large document detected, prioritizing content for formula extraction")
        # Try to find sections with formulas (common patterns)
        import re
        # Look for mathematical content indicators
        math_sections = []
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if re.search(r'[=+\-*/∫∑∏√∂∇∆λμσπ]|equation|formula|theorem|lemma|proof', line, re.IGNORECASE):
                # Include surrounding context
                start = max(0, i-5)
                end = min(len(lines), i+6)
                math_sections.extend(lines[start:end])
        
        if math_sections:
            # Use math-rich sections for better formula extraction
            math_text = '\n'.join(math_sections)
            if len(math_text) > 50000:  # Still too long
                text = math_text[:98000]
            else:
                # Combine math sections with beginning of document
                remaining_space = 98000 - len(math_text)
                text = text[:remaining_space] + '\n\n[Mathematical content sections:]\n' + math_text
        else:
            # No math indicators found, use first part
            text = text[:98000]
    
    return text

def extract_keywords_with_deepseek(text, headers):
    """Extract keywords using Deepseek API"""
    try:
        keyword_messages = [
            {
                'role': 'system',
                'content': 'You are a helpful assistant that extracts keywords from academic papers. Always respond with valid JSON.'
            },
            {
                'role': 'user',
                'content': f"""Analyze the following academic paper and extract the key technical terms and concepts.
For each keyword, provide a relevance score between 0 and 1.
Return ONLY a valid JSON array of objects with 'text' and 'score' properties.
Example format: [{{"text": "machine learning", "score": 0.95}}, {{"text": "neural networks", "score": 0.85}}]

Paper text:
{text}"""
            }
        ]
        
        keyword_response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers=headers,
            json={
                'model': 'deepseek-chat',
                'messages': keyword_messages,
                'temperature': 0.3,
                'max_tokens': 4000
            },
            timeout=60
        )
        
        if keyword_response.ok:
            response_content = keyword_response.json()['choices'][0]['message']['content']
            try:
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\[.*\]', response_content, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                else:
                    return json.loads(response_content)
            except json.JSONDecodeError:
                print(f"Invalid JSON from keywords API: {response_content}")
                return []
        else:
            print(f"Keywords API error: {keyword_response.text}")
            return []

    except Exception as e:
        print(f"Error in keywords extraction: {str(e)}")
        return []

def generate_summary_with_deepseek(text, headers):
    """Generate summary using Deepseek API"""
    try:
        summary_messages = [
            {
                'role': 'system',
                'content': 'You are a helpful assistant that summarizes academic papers.'
            },
            {
                'role': 'user',
                'content': f"""Provide a comprehensive summary of the following academic paper.
Focus on the main contributions, methodology, and key findings.
Keep the response concise and well-structured.

Paper text:
{text}"""
            }
        ]
        
        summary_response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers=headers,
            json={
                'model': 'deepseek-chat',
                'messages': summary_messages,
                'temperature': 0.3,
                'max_tokens': 4000
            },
            timeout=60
        )
        
        if summary_response.ok:
            return summary_response.json()['choices'][0]['message']['content']
        else:
            print(f"Summary API error: {summary_response.text}")
            return "Error generating summary"

    except Exception as e:
        print(f"Error in summary generation: {str(e)}")
        return "Error generating summary"

def extract_formulas_with_deepseek(text, headers):
    """Extract formulas using Deepseek API"""
    try:
        related_messages = [
            {
                'role': 'system',
                'content': '''You are an expert mathematician and AI assistant specialized in extracting mathematical formulas from academic papers. 
Your task is to identify and extract ALL mathematical formulas, equations, and mathematical expressions from the given text, try as much as you can.

IMPORTANT INSTRUCTIONS:
1. Extract EVERY mathematical formula, equation, or expression you find
2. Include inline formulas, displayed equations, and mathematical definitions
3. Preserve the original notation as much as possible
4. For each formula, provide context about what it represents
5. Always respond with valid JSON format

You must be thorough and extract ALL formulas, not just the main ones.'''
            },
            {
                'role': 'user',
                'content': f"""Extract ALL mathematical formulas and equations from the following paper text.

For each formula found, provide:
- The formula itself (in LaTeX notation if possible)
- A detailed description explaining what the formula represents and what each variable means
- The context or section where it appears
- Whether it's a definition, theorem, lemma, or general equation
- A Chinese description that explains the formula's purpose

Return a JSON array where each element has these properties:
- "formula": The mathematical expression (use LaTeX notation)
- "description": What the formula represents or calculates
- "variables": Detailed explanation of what each variable/symbol means in the formula
- "variables_chinese": Chinese translation of variable explanations (same structure as variables)
- "type": One of ["definition", "theorem", "lemma", "equation", "inequality", "identity", "other"]
- "context": Brief context about where/how it's used
- "chinese_description": A comprehensive Chinese description of the formula and its purpose

Example format:
[
  {{
    "formula": "E = mc^2",
    "description": "Einstein's mass-energy equivalence relation",
    "variables": {{"E": "energy (joules)", "m": "mass (kilograms)", "c": "speed of light in vacuum (≈3×10^8 m/s)"}},
    "variables_chinese": {{"E": "能量 (焦耳)", "m": "质量 (千克)", "c": "真空中的光速 (≈3×10^8 m/s)"}},
    "type": "equation",
    "context": "Fundamental equation in special relativity theory",
    "chinese_description": "爱因斯坦质能等价公式，表示质量和能量之间的等价关系"
  }},
  {{
    "formula": "F = ma",
    "description": "Newton's second law of motion",
    "variables": {{"F": "net force (newtons)", "m": "mass (kilograms)", "a": "acceleration (m/s²)"}},
    "variables_chinese": {{"F": "净力 (牛顿)", "m": "质量 (千克)", "a": "加速度 (m/s²)"}},
    "type": "equation", 
    "context": "Classical mechanics fundamental law",
    "chinese_description": "牛顿第二定律，描述物体受力与加速度的关系"
  }}
]

Paper text:
{text}

IMPORTANT INSTRUCTIONS:
1. Extract EVERY formula, even simple ones like "x + y = z" or "f(x) = ax + b"
2. For each variable or symbol in the formula, explain what it represents
3. Include units of measurement when relevant
4. Provide comprehensive Chinese descriptions that explain the formula's significance
5. Be thorough and detailed in variable explanations"""
            }
        ]
        
        related_response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers=headers,
            json={
                'model': 'deepseek-chat',
                'messages': related_messages,
                'temperature': 0.1,  # Lower temperature for more consistent extraction
                'max_tokens': 4000   # Increased token limit for more formulas
            },
            timeout=120  # Increased timeout for large documents
        )
        
        if related_response.ok:
            response_content = related_response.json()['choices'][0]['message']['content']
            try:
                # Try to extract JSON from the response
                import re
                # Look for JSON array in the response
                json_match = re.search(r'\[[\s\S]*\]', response_content)
                if json_match:
                    formulas = json.loads(json_match.group())
                    return formulas
                else:
                    # Try direct JSON parsing
                    return json.loads(response_content)
            except json.JSONDecodeError as e:
                print(f"Invalid JSON from formulas API: {response_content}")
                print(f"JSON Error: {str(e)}")
                return []
        else:
            print(f"Formulas API error: {related_response.text}")
            return []

    except Exception as e:
        print(f"Error in formula extraction: {str(e)}")
        return [] 