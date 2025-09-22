# BRAIN Project - Modular Structure

This document describes the modular structure implemented for the BRAIN Expression Template Decoder application.

## Overview

The application has been refactored to use Flask blueprints for better code organization and maintainability. The paper analysis functionality has been separated into its own module.

## Project Structure

```
BRAINProject/
├── app.py                          # Main Flask application
├── blueprints/                     # Blueprint modules
│   ├── __init__.py                # Package initialization
│   └── paper_analysis.py          # Paper analysis blueprint
├── templates/
│   ├── index.html                 # Main page template
│   └── paper_analysis.html        # Paper analysis page template
├── static/
│   ├── script.js                  # Main application JavaScript
│   ├── paper_analysis.js          # Paper analysis JavaScript
│   ├── brain.js                   # BRAIN API functions
│   ├── decoder.js                 # Template decoder functions
│   └── styles.css                 # Application styles
└── requirements.txt               # Python dependencies
```

## Blueprint Structure

### Paper Analysis Blueprint (`blueprints/paper_analysis.py`)

The paper analysis functionality has been moved to a separate blueprint that includes:

#### Routes:
- `GET /paper-analysis/` - Paper analysis page
- `POST /paper-analysis/api/test-deepseek` - Test Deepseek API connection
- `POST /paper-analysis/api/analyze-paper` - Analyze uploaded papers

#### Functions:
- File processing functions for various formats (PDF, DOCX, RTF, LaTeX, Markdown, plain text)
- Deepseek API integration functions
- Text extraction and processing utilities

### Main Application (`app.py`)

The main application now focuses on:

#### Routes:
- BRAIN API authentication and session management
- BRAIN operators and data fields API
- Expression testing functionality
- Main application routes

#### Features:
- Auto-dependency installation
- BRAIN API integration
- Session management for multiple users
- Template decoding functionality

## Benefits of This Structure

1. **Modularity**: Related functionality is grouped together in blueprints
2. **Maintainability**: Easier to maintain and update individual modules
3. **Scalability**: Easy to add new blueprints for additional features
4. **Separation of Concerns**: Each blueprint handles a specific domain
5. **Testability**: Individual modules can be tested independently

## URL Structure

### Before Refactoring:
- `/paper-analysis` - Paper analysis page
- `/api/test-deepseek` - Test Deepseek API
- `/api/analyze-paper` - Analyze paper

### After Refactoring:
- `/paper-analysis/` - Paper analysis page (blueprint)
- `/paper-analysis/api/test-deepseek` - Test Deepseek API (blueprint)
- `/paper-analysis/api/analyze-paper` - Analyze paper (blueprint)

## Dependencies

### Main Application Dependencies:
- Flask
- Flask-CORS
- requests
- pandas (for BRAIN API integration)

### Paper Analysis Dependencies:
- All main dependencies plus:
- PyPDF2 or pdfplumber (for PDF processing)
- python-docx (for Word documents)
- docx2txt (for legacy DOC files)
- striprtf (for RTF files)
- PyMuPDF (alternative PDF library)

## Adding New Blueprints

To add a new blueprint:

1. Create a new file in the `blueprints/` directory
2. Define your blueprint:
   ```python
   from flask import Blueprint
   
   new_blueprint = Blueprint('new_feature', __name__, url_prefix='/new-feature')
   
   @new_blueprint.route('/')
   def index():
       return render_template('new_feature.html')
   ```
3. Import and register the blueprint in `app.py`:
   ```python
   from blueprints.new_feature import new_blueprint
   app.register_blueprint(new_blueprint)
   ```

## Notes

- The paper analysis JavaScript file (`static/paper_analysis.js`) has been updated to use the new blueprint URLs
- The main index template has been updated to link to the correct blueprint route
- Unused imports have been removed from the main application file
- All paper analysis functionality remains intact but is now properly modularized 