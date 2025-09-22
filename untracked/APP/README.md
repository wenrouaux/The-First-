# BRAIN Expression Template Decoder - Flask Web Application

A comprehensive Flask web application for decoding string templates with grammar checking, syntax highlighting, and seamless integration with WorldQuant BRAIN platform for real operator data.

## 🚀 Features

### Core Functionality
- **Template Detection**: Automatically detects `<template_name/>` patterns in expressions
- **Grammar Checking**: Real-time validation for semicolons, comments, and syntax
- **Syntax Highlighting**: Color-coded display with line numbers and autocomplete
- **Template Decoding**: Two modes for generating expressions
  - **Full Iteration**: Generate all possible combinations of template variables
  - **Random Iteration**: Generate a random sample of specified size
- **Export Options**: Copy results or download as text file

### Template Types
- **Op (Operators)** - Blue button, integrates with BRAIN operators
- **Data (Data Fields)** - Green button, for data field configuration  
- **Normal (Parameters)** - Gray button, for general parameters

### BRAIN Integration
- **Built-in API Integration**: Direct connection to WorldQuant BRAIN API with CORS handling
- **186+ Operators**: Access to all operator categories (Arithmetic, Ranking, Reduce, Time Series, etc.)
- **800+ Data Fields**: From fundamental datasets with search and filtering
- **Advanced Search**: Filter operators by category and search by name
- **Multi-select Interface**: Professional operator selection with visual feedback

## 🛠️ Setup and Installation

### Prerequisites
- Python 3.7 or higher
- pip (Python package installer)
- WorldQuant BRAIN account (for BRAIN integration features)

### Quick Start

1. **Clone or download** this repository to your local machine

2. **Run the application** (dependencies will be installed automatically!):
   
   **On Windows:**
   ```bash
   # Double-click run_app.bat or run in terminal:
   run_app.bat
   ```
   
   **On macOS/Linux:**
   ```bash
   # Make the script executable (first time only):
   chmod +x run_app.sh
   
   # Run the application:
   ./run_app.sh
   ```
   
   **Or run directly with Python:**
   ```bash
   python app.py
   ```

3. **Automatic dependency installation**:
   - The application will automatically check for missing dependencies
   - If any packages are missing, they will be installed from requirements.txt
   - **For users in China**: Dependencies are automatically downloaded from Tsinghua University mirror for faster installation
   - No manual installation needed!

4. **Open the application**:
   - The Flask server starts on `http://localhost:5000`
   - Open your web browser and navigate to `http://localhost:5000`
   - Everything is integrated - no separate proxy server needed!

### For Users in China (中国用户)

The application automatically uses Tsinghua University's PyPI mirror (清华大学镜像) for faster downloads. If you prefer to install dependencies manually:

**Windows:**
```bash
# Use the setup script with Tsinghua mirror
setup_tsinghua.bat
```

**macOS/Linux:**
```bash
# Make executable and run
chmod +x setup_tsinghua.sh
./setup_tsinghua.sh
```

**Manual installation with Tsinghua mirror:**
```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
```

**Configuring Alternative Mirrors:**
You can change the mirror source by editing `mirror_config.txt`. The file includes several popular Chinese mirrors:
- Tsinghua (清华大学) - Default
- Aliyun (阿里云)
- Douban (豆瓣)
- USTC (中国科学技术大学)

### Manual Installation

If the automatic installation doesn't work, you can install manually:

```bash
# Install dependencies from requirements.txt
pip install -r requirements.txt

# Or install individual packages
pip install flask==2.3.3 flask-cors==4.0.0 requests==2.31.0 pandas==2.0.3

# Start the application
python app.py
```

**Note**: The application includes automatic dependency checking and will attempt to install missing packages when you run it.

## 🔗 BRAIN Integration

### Setup
1. **No separate setup required** - BRAIN API integration is built into the Flask application
2. **Connect to BRAIN**: Click "Connect to BRAIN" button in the web interface
3. **Enter credentials**: Use your WorldQuant BRAIN username and password
4. **Automatic operator loading**: The system fetches all available operators (186+)

### Using BRAIN Operators
1. **Configure templates**: Set template type to "Op" 
2. **Choose from BRAIN**: Click the "Choose from BRAIN" button in template configuration
3. **Search and filter**: Use the search box and category filter to find operators
4. **Multi-select**: Check multiple operators and apply them to your template
5. **Generate combinations**: Decode templates to get all possible operator combinations

## 📝 Usage Guide

### 1. Expression Editor
- Type or paste your expression in the main editor
- Grammar is checked automatically with visual feedback
- Templates are detected and highlighted in real-time
- Use autocomplete by typing `<` for template suggestions

### 2. Template Management
- Templates appear in the right panel as they're detected
- Click template type buttons (Op/Data/Normal) to configure
- Visual indicators show configured (✓) vs unconfigured (•) templates
- Click template names to view current configuration

### 3. Template Configuration
- **Normal templates**: Enter comma-separated values manually
- **Op templates**: Choose from BRAIN operators or enter manually
- **Data templates**: Enter data field specifications

### 4. Template Decoding
Two options for generating expressions:
- **full_iteration**: Generate all possible combinations
  - Creates every possible combination using Cartesian product
  - Shows first 999 results with search functionality for large datasets
- **random_iteration**: Generate random sample
  - Specify number of random expressions (default: 10)
  - Generates all combinations first, then randomly selects the specified number
  - Useful for testing or when you only need a subset of possibilities
- Each template must have at least one configured value
- Results are displayed with copy and download options

## 💡 Example Expression

```
positive_sentiment = rank(<backfill_op/>(<positive_sentiment/>,<days/>));
negative_sentiment = rank(<backfill_op/>(<negative_sentiment/>, <days/>));
sentiment_difference = <compare_op/>(positive_sentiment, negative_sentiment);
<time_series_operator/>(sentiment_difference, <days/>)
```

### Example Configuration
- `<days/>` → `7, 14, 30`
- `<compare_op/>` → `ts_max, ts_min` (selected from BRAIN)
- `<time_series_operator/>` → `ts_delta, ts_mean` (selected from BRAIN)

### Generated Output
The decoder will generate all combinations:
```
ts_delta(ts_max(7), 7)
ts_delta(ts_max(14), 14)
ts_delta(ts_max(30), 30)
ts_delta(ts_min(7), 7)
ts_delta(ts_min(14), 14)
ts_delta(ts_min(30), 30)
ts_mean(ts_max(7), 7)
...and so on
```

## 🎯 Grammar Rules

- Use `/* */` for multi-line comments
- End statements with `;` (except the last line)
- No classes, objects, pointers, or functions allowed
- The last line is the Alpha expression for BRAIN simulator

## 🏗️ Technical Architecture

### Flask Application Structure
```
BRAINProject/
├── app.py                 # Flask application with auto-dependency installation
├── templates/
│   └── index.html        # Main web interface template
├── static/
│   ├── styles.css        # Application styling
│   ├── script.js         # Core application logic
│   ├── decoder.js        # Template decoding algorithms
│   └── brain.js         # BRAIN API integration module
├── requirements.txt      # Python dependencies
├── mirror_config.txt    # PyPI mirror configuration
├── run_app.bat          # Windows startup script
├── run_app.sh           # Unix/macOS startup script
├── setup_tsinghua.bat   # Windows setup with Tsinghua mirror (for China)
├── setup_tsinghua.sh    # Unix setup with Tsinghua mirror (for China)
├── brain_function_tester.ipynb  # Jupyter notebook for testing
└── README.md           # This file
```

### Key Components
- **Flask Backend**: Handles BRAIN API authentication and data fetching
- **Template Engine**: Jinja2 templates for dynamic content
- **Static Assets**: CSS and JavaScript served efficiently
- **CORS Handling**: Built-in cross-origin request support
- **Session Management**: Secure session handling for BRAIN authentication

### API Endpoints
- `GET /` - Main application page
- `POST /api/authenticate` - BRAIN authentication
- `GET /api/operators` - Fetch BRAIN operators with pagination
- `GET /api/datafields` - Fetch BRAIN data fields
- `GET /api/status` - Check authentication status
- `POST /api/logout` - Logout from BRAIN

## 🔧 Advanced Features

### Operator Fetching
- **Robust Pagination**: Handles BRAIN API pagination automatically
- **Category Support**: Fetches operators from all categories
- **Error Handling**: Multiple fallback strategies for reliable data loading
- **Debugging**: Built-in endpoints for API response analysis

### Template Processing
- **Real-time Detection**: Templates detected as you type
- **Visual Feedback**: Color-coded syntax highlighting
- **Status Indicators**: Clear visual cues for template configuration state
- **Validation**: Ensures all templates are configured before decoding

### User Experience
- **Professional UI**: Clean, modern interface design
- **Responsive Design**: Works on desktop and tablet devices
- **Keyboard Shortcuts**: Efficient template autocomplete
- **Export Options**: Copy individual results or download all

## 🐛 Troubleshooting

### Common Issues

1. **Flask server won't start**:
   - Check Python version (3.7+ required)
   - Install missing dependencies: `pip install -r requirements.txt`

2. **BRAIN connection fails**:
   - Verify your BRAIN credentials
   - Check internet connectivity
   - Ensure no firewall blocking outbound HTTPS requests

3. **Templates not detecting**:
   - Check template syntax: `<template_name/>`
   - Refresh templates manually using the button

4. **No operators loading**:
   - Verify BRAIN authentication is successful
   - Check browser console for error messages
   - Try logout and re-authentication

### Debug Mode
Run the application in debug mode for detailed error information:
```bash
python app.py
# Debug mode is enabled by default in the application
```

## 📈 Performance

- **Efficient Loading**: Operators loaded once during authentication
- **Pagination Handling**: Automatically fetches all data regardless of API pagination
- **Session Management**: Persistent sessions for better user experience
- **Optimized Frontend**: Minimal JavaScript dependencies for fast loading

## 🔐 Security

- **Session Security**: Flask secure sessions with configurable secret key
- **Credential Handling**: Credentials never stored, only used for API authentication
- **CORS Protection**: Properly configured cross-origin request handling
- **Input Validation**: Template syntax validation and grammar checking

## 🚧 Future Enhancements

- **Template Library**: Save and share template configurations
- **Advanced Filtering**: More sophisticated operator and data field filtering
- **Batch Operations**: Process multiple expressions simultaneously
- **API Integration**: Connect to additional financial data providers
- **Export Formats**: Support for JSON, CSV, and other output formats

---

**Note**: This Flask application replaces the previous HTML+proxy architecture, providing a more robust and integrated solution for BRAIN template decoding. 