"""
BRAIN Expression Template Decoder - Flask Web Application
A complete web application for decoding string templates with WorldQuant BRAIN integration
"""

# Auto-install dependencies if missing
import subprocess
import sys
import os

def install_requirements():
    """Install required packages from requirements.txt if they're missing"""
    print("🔍 Checking and installing required dependencies...")
    print("📋 Verifying packages needed for BRAIN Expression Template Decoder...")
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Check if requirements.txt exists in the script directory
    req_file = os.path.join(script_dir, 'requirements.txt')
    if not os.path.exists(req_file):
        print("❌ Error: requirements.txt not found!")
        print(f"Looking for: {req_file}")
        return False
    
    # Read mirror configuration if it exists
    mirror_url = 'https://pypi.tuna.tsinghua.edu.cn/simple'  # Default to Tsinghua
    mirror_config_file = os.path.join(script_dir, 'mirror_config.txt')
    
    if os.path.exists(mirror_config_file):
        try:
            with open(mirror_config_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and line.startswith('http'):
                        mirror_url = line
                        break
        except Exception as e:
            print(f"Warning: Could not read mirror configuration: {e}")
    
    # Try to import the main packages to check if they're installed
    packages_to_check = {
        'flask': 'flask',
        'flask_cors': 'flask-cors',
        'requests': 'requests',
        'pandas': 'pandas',
        'PyPDF2': 'PyPDF2',
        'docx': 'python-docx',
        'pdfplumber': 'pdfplumber',
        'fitz': 'PyMuPDF',
        'cozepy': 'cozepy',
        'lxml': 'lxml',
        'bs4': 'beautifulsoup4'
    }
    
    missing_packages = []
    for import_name, pip_name in packages_to_check.items():
        try:
            __import__(import_name)
        except ImportError:
            missing_packages.append(pip_name)
            print(f"Missing package: {pip_name} (import name: {import_name})")
    
    if missing_packages:
        print(f"⚠️  Missing packages detected: {', '.join(missing_packages)}")
        print("📦 Installing dependencies from requirements.txt...")
        print(f"🌐 Using mirror: {mirror_url}")
        
        try:
            # Install all requirements using configured mirror
            subprocess.check_call([
                sys.executable, '-m', 'pip', 'install', 
                '-i', mirror_url,
                '-r', req_file
            ])
            print("✅ All dependencies installed successfully!")
            return True
        except subprocess.CalledProcessError:
            print(f"❌ Error: Failed to install dependencies using {mirror_url}")
            print("🔄 Trying with default PyPI...")
            try:
                # Fallback to default PyPI
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', req_file])
                print("✅ All dependencies installed successfully!")
                return True
            except subprocess.CalledProcessError:
                print("❌ Error: Failed to install dependencies. Please run manually:")
                print(f"  {sys.executable} -m pip install -i {mirror_url} -r requirements.txt")
                return False
    else:
        print("✅ All required dependencies are already installed!")
        return True

# Check and install dependencies before importing
# This will run every time the module is imported, but only install if needed
def check_and_install_dependencies():
    """Check and install dependencies if needed"""
    if not globals().get('_dependencies_checked'):
        if install_requirements():
            globals()['_dependencies_checked'] = True
            return True
        else:
            print("\nPlease install the dependencies manually and try again.")
            return False
    return True

# Always run the dependency check when this module is imported
print("🚀 Initializing BRAIN Expression Template Decoder...")
if not check_and_install_dependencies():
    if __name__ == "__main__":
        sys.exit(1)
    else:
        print("⚠️  Warning: Some dependencies may be missing. Please run 'pip install -r requirements.txt'")
        print("🔄 Continuing with import, but some features may not work properly.")

# Now import the packages
try:
    from flask import Flask, render_template, request, jsonify, session as flask_session
    from flask_cors import CORS
    import requests
    import json
    import time
    import os
    from datetime import datetime
    print("📚 Core packages imported successfully!")
except ImportError as e:
    print(f"❌ Failed to import core packages: {e}")
    print("Please run: pip install -r requirements.txt")
    if __name__ == "__main__":
        sys.exit(1)
    raise

app = Flask(__name__)
app.secret_key = 'brain_template_decoder_secret_key_change_in_production'
CORS(app)

print("🌐 Flask application initialized with CORS support!")

# BRAIN API configuration
BRAIN_API_BASE = 'https://api.worldquantbrain.com'

# Store BRAIN sessions (in production, use proper session management like Redis)
brain_sessions = {}

print("🧠 BRAIN API integration configured!")

def sign_in_to_brain(username, password):
    """Sign in to BRAIN API with retry logic and biometric authentication support"""
    from urllib.parse import urljoin
    
    # Create a session to persistently store the headers
    session = requests.Session()
    # Save credentials into the session 
    session.auth = (username, password)
    
    retry_count = 0
    max_retries = 3
    
    while retry_count < max_retries:
        try:
            # Send a POST request to the /authentication API
            response = session.post(f'{BRAIN_API_BASE}/authentication')
            
            # Check if biometric authentication is needed
            if response.status_code == requests.codes.unauthorized:
                if response.headers.get("WWW-Authenticate") == "persona":
                    # Get biometric auth URL
                    location = response.headers.get("Location")
                    if location:
                        biometric_url = urljoin(response.url, location)
                        
                        # Return special response indicating biometric auth is needed
                        return {
                            'requires_biometric': True,
                            'biometric_url': biometric_url,
                            'session': session,
                            'location': location
                        }
                    else:
                        raise Exception("Biometric authentication required but no Location header provided")
                else:
                    # Regular authentication failure
                    print("Incorrect username or password")
                    raise requests.HTTPError("Authentication failed: Invalid username or password")
            
            # If we get here, authentication was successful
            response.raise_for_status()
            print("Authentication successful.")
            return session
            
        except requests.HTTPError as e:
            if "Invalid username or password" in str(e) or "Authentication failed" in str(e):
                raise  # Don't retry for invalid credentials
            print(f"HTTP error occurred: {e}")
            retry_count += 1
            if retry_count < max_retries:
                print(f"Retrying... Attempt {retry_count + 1} of {max_retries}")
                time.sleep(10)
            else:
                print("Max retries reached. Authentication failed.")
                raise
        except Exception as e:
            print(f"Error during authentication: {e}")
            retry_count += 1
            if retry_count < max_retries:
                print(f"Retrying... Attempt {retry_count + 1} of {max_retries}")
                time.sleep(10)
            else:
                print("Max retries reached. Authentication failed.")
                raise

# Routes
@app.route('/')
def index():
    """Main application page"""
    return render_template('index.html')

@app.route('/simulator')
def simulator():
    """User-friendly simulator interface"""
    return render_template('simulator.html')

@app.route('/api/simulator/logs', methods=['GET'])
def get_simulator_logs():
    """Get available log files in the simulator directory"""
    try:
        import glob
        import os
        from datetime import datetime
        
        # Look for log files in the current directory and simulator directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        simulator_dir = os.path.join(script_dir, 'simulator')
        
        log_files = []
        
        # Check both current directory and simulator directory
        for directory in [script_dir, simulator_dir]:
            if os.path.exists(directory):
                pattern = os.path.join(directory, 'wqb*.log')
                for log_file in glob.glob(pattern):
                    try:
                        stat = os.stat(log_file)
                        log_files.append({
                            'filename': os.path.basename(log_file),
                            'path': log_file,
                            'size': f"{stat.st_size / 1024:.1f} KB",
                            'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                            'mtime': stat.st_mtime
                        })
                    except Exception as e:
                        print(f"Error reading log file {log_file}: {e}")
        
        # Sort by modification time (newest first)
        log_files.sort(key=lambda x: x['mtime'], reverse=True)
        
        # Find the latest log file
        latest = log_files[0]['filename'] if log_files else None
        
        return jsonify({
            'logs': log_files,
            'latest': latest,
            'count': len(log_files)
        })
        
    except Exception as e:
        return jsonify({'error': f'Error getting log files: {str(e)}'}), 500

@app.route('/api/simulator/logs/<filename>', methods=['GET'])
def get_simulator_log_content(filename):
    """Get content of a specific log file"""
    try:
        import os
        
        # Security: only allow log files with safe names
        if not filename.startswith('wqb') or not filename.endswith('.log'):
            return jsonify({'error': 'Invalid log file name'}), 400
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        simulator_dir = os.path.join(script_dir, 'simulator')
        
        # Look for the file in both directories
        log_path = None
        for directory in [script_dir, simulator_dir]:
            potential_path = os.path.join(directory, filename)
            if os.path.exists(potential_path):
                log_path = potential_path
                break
        
        if not log_path:
            return jsonify({'error': 'Log file not found'}), 404
        
        # Read file content with multiple encoding attempts
        content = None
        encodings_to_try = ['utf-8', 'gbk', 'gb2312', 'big5', 'latin-1', 'cp1252']
        
        for encoding in encodings_to_try:
            try:
                with open(log_path, 'r', encoding=encoding) as f:
                    content = f.read()
                print(f"Successfully read log file with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"Error reading with {encoding}: {e}")
                continue
        
        if content is None:
            # Last resort: read as binary and decode with error handling
            try:
                with open(log_path, 'rb') as f:
                    raw_content = f.read()
                content = raw_content.decode('utf-8', errors='replace')
                print("Used UTF-8 with error replacement for log content")
            except Exception as e:
                content = f"Error: Could not decode file content - {str(e)}"
        
        response = jsonify({
            'content': content,
            'filename': filename,
            'size': len(content)
        })
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        return response
        
    except Exception as e:
        return jsonify({'error': f'Error reading log file: {str(e)}'}), 500

@app.route('/api/simulator/test-connection', methods=['POST'])
def test_simulator_connection():
    """Test BRAIN API connection for simulator"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Test connection using the existing sign_in_to_brain function
        result = sign_in_to_brain(username, password)
        
        # Handle biometric authentication requirement
        if isinstance(result, dict) and result.get('requires_biometric'):
            return jsonify({
                'success': False,
                'error': 'Biometric authentication required. Please use the main interface first to complete authentication.',
                'requires_biometric': True
            })
        
        # Test a simple API call to verify connection
        brain_session = result
        response = brain_session.get(f'{BRAIN_API_BASE}/data-fields/open')
        
        if response.ok:
            return jsonify({
                'success': True,
                'message': 'Connection successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'API test failed: {response.status_code}'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection failed: {str(e)}'
        })

@app.route('/api/simulator/run', methods=['POST'])
def run_simulator_with_params():
    """Run simulator with user-provided parameters in a new terminal"""
    try:
        import subprocess
        import threading
        import json
        import os
        import tempfile
        import sys
        import time
        
        # Get form data
        json_file = request.files.get('jsonFile')
        username = request.form.get('username')
        password = request.form.get('password')
        start_position = int(request.form.get('startPosition', 0))
        concurrent_count = int(request.form.get('concurrentCount', 3))
        random_shuffle = request.form.get('randomShuffle') == 'true'
        use_multi_sim = request.form.get('useMultiSim') == 'true'
        alpha_count_per_slot = int(request.form.get('alphaCountPerSlot', 3))
        
        if not json_file or not username or not password:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Validate and read JSON file
        try:
            json_content = json_file.read().decode('utf-8')
            expressions_data = json.loads(json_content)
            if not isinstance(expressions_data, list):
                return jsonify({'error': 'JSON file must contain an array of expressions'}), 400
        except Exception as e:
            return jsonify({'error': f'Invalid JSON file: {str(e)}'}), 400
        
        # Get paths
        script_dir = os.path.dirname(os.path.abspath(__file__))
        simulator_dir = os.path.join(script_dir, 'simulator')
        
        # Create temporary files for the automated run
        temp_json_path = os.path.join(simulator_dir, f'temp_expressions_{int(time.time())}.json')
        temp_script_path = os.path.join(simulator_dir, f'temp_automated_{int(time.time())}.py')
        temp_batch_path = os.path.join(simulator_dir, f'temp_run_{int(time.time())}.bat')
        
        try:
            # Save the JSON data to temporary file
            with open(temp_json_path, 'w', encoding='utf-8') as f:
                json.dump(expressions_data, f, ensure_ascii=False, indent=2)
            
            # Create the automated script that calls automated_main
            script_content = f'''
import asyncio
import sys
import os
import json

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import simulator_wqb

async def run_automated():
    """Run the automated simulator with parameters from web interface"""
    try:
        # Load JSON data
        with open(r"{temp_json_path}", 'r', encoding='utf-8') as f:
            json_content = f.read()
        
        # Call automated_main with parameters
        result = await simulator_wqb.automated_main(
            json_file_content=json_content,
            username="{username}",
            password="{password}",
            start_position={start_position},
            concurrent_count={concurrent_count},
            random_shuffle={random_shuffle},
            use_multi_sim={use_multi_sim},
            alpha_count_per_slot={alpha_count_per_slot}
        )
        
        if result['success']:
            print("\\n" + "="*60)
            print("🎉 WEB INTERFACE AUTOMATION SUCCESS 🎉")
            print("="*60)
            print(f"✅ Total simulations: {{result['results']['total']}}")
            print(f"✅ Successful: {{result['results']['successful']}}")
            print(f"❌ Failed: {{result['results']['failed']}}")
            if result['results']['alphaIds']:
                print(f"📊 Generated {{len(result['results']['alphaIds'])}} Alpha IDs")
            print("="*60)
        else:
            print("\\n" + "="*60)
            print("❌ WEB INTERFACE AUTOMATION FAILED")
            print("="*60)
            print(f"Error: {{result['error']}}")
            print("="*60)
            
    except Exception as e:
        print(f"\\n❌ Script execution error: {{e}}")
    
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(r"{temp_json_path}"):
                os.remove(r"{temp_json_path}")
            if os.path.exists(r"{temp_script_path}"):
                os.remove(r"{temp_script_path}")
            if os.path.exists(r"{temp_batch_path}"):
                os.remove(r"{temp_batch_path}")
        except:
            pass
        
        print("\\n🔄 Press any key to close this window...")
        input()

if __name__ == '__main__':
    asyncio.run(run_automated())
'''
            
            # Save the script
            with open(temp_script_path, 'w', encoding='utf-8') as f:
                f.write(script_content)
            
            # Create batch file for Windows
            batch_content = f'''@echo off
cd /d "{simulator_dir}"
python "{os.path.basename(temp_script_path)}"
'''
            with open(temp_batch_path, 'w', encoding='utf-8') as f:
                f.write(batch_content)
            
            # Launch in new terminal
            def launch_simulator():
                try:
                    if os.name == 'nt':  # Windows
                        # Use batch file to avoid path issues
                        subprocess.Popen([
                            temp_batch_path
                        ], creationflags=subprocess.CREATE_NEW_CONSOLE)
                    else:  # Unix-like systems
                        # Try different terminal emulators
                        terminals = ['gnome-terminal', 'xterm', 'konsole', 'terminal']
                        for terminal in terminals:
                            try:
                                if terminal == 'gnome-terminal':
                                    subprocess.Popen([
                                        terminal, '--working-directory', simulator_dir,
                                        '--', 'python3', os.path.basename(temp_script_path)
                                    ])
                                else:
                                    subprocess.Popen([
                                        terminal, '-e', 
                                        f'cd "{simulator_dir}" && python3 "{os.path.basename(temp_script_path)}"'
                                    ])
                                break
                            except FileNotFoundError:
                                continue
                        else:
                            # Fallback: run in background if no terminal found
                            subprocess.Popen([
                                sys.executable, temp_script_path
                            ], cwd=simulator_dir)
                except Exception as e:
                    print(f"Error launching simulator: {e}")
            
            # Start the simulator in a separate thread
            thread = threading.Thread(target=launch_simulator)
            thread.daemon = True
            thread.start()
            
            return jsonify({
                'success': True,
                'message': 'Simulator launched in new terminal window',
                'parameters': {
                    'expressions_count': len(expressions_data),
                    'concurrent_count': concurrent_count,
                    'use_multi_sim': use_multi_sim,
                    'alpha_count_per_slot': alpha_count_per_slot if use_multi_sim else None
                }
            })
            
        except Exception as e:
            # Clean up on error
            try:
                if os.path.exists(temp_json_path):
                    os.remove(temp_json_path)
                if os.path.exists(temp_script_path):
                    os.remove(temp_script_path)
                if os.path.exists(temp_batch_path):
                    os.remove(temp_batch_path)
            except:
                pass
            raise e
        
    except Exception as e:
        return jsonify({'error': f'Failed to run simulator: {str(e)}'}), 500

@app.route('/api/simulator/stop', methods=['POST'])
def stop_simulator():
    """Stop running simulator"""
    try:
        # This is a placeholder - in a production environment, you'd want to 
        # implement proper process management to stop running simulations
        return jsonify({
            'success': True,
            'message': 'Stop signal sent'
        })
    except Exception as e:
        return jsonify({'error': f'Failed to stop simulator: {str(e)}'}), 500

@app.route('/api/authenticate', methods=['POST'])
def authenticate():
    """Authenticate with BRAIN API"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Authenticate with BRAIN
        result = sign_in_to_brain(username, password)
        
        # Check if biometric authentication is required
        if isinstance(result, dict) and result.get('requires_biometric'):
            # Store the session temporarily with biometric pending status
            session_id = f"{username}_{int(time.time())}_biometric_pending"
            brain_sessions[session_id] = {
                'session': result['session'],
                'username': username,
                'timestamp': time.time(),
                'biometric_pending': True,
                'biometric_location': result['location']
            }
            
            # Store session ID in Flask session
            flask_session['brain_session_id'] = session_id
            
            return jsonify({
                'success': False,
                'requires_biometric': True,
                'biometric_url': result['biometric_url'],
                'session_id': session_id,
                'message': 'Please complete biometric authentication by visiting the provided URL'
            })
        
        # Regular successful authentication
        brain_session = result
        
        # Store session
        session_id = f"{username}_{int(time.time())}"
        brain_sessions[session_id] = {
            'session': brain_session,
            'username': username,
            'timestamp': time.time()
        }
        
        # Store session ID in Flask session
        flask_session['brain_session_id'] = session_id
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': 'Authentication successful'
        })
        
    except requests.HTTPError as e:
        if e.response.status_code == 401:
            return jsonify({'error': 'Invalid username or password'}), 401
        else:
            return jsonify({'error': f'Authentication failed: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Authentication error: {str(e)}'}), 500

@app.route('/api/complete-biometric', methods=['POST'])
def complete_biometric():
    """Complete biometric authentication after user has done it in browser"""
    try:
        from urllib.parse import urljoin
        
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        session_info = brain_sessions[session_id]
        
        # Check if this session is waiting for biometric completion
        if not session_info.get('biometric_pending'):
            return jsonify({'error': 'Session is not pending biometric authentication'}), 400
        
        brain_session = session_info['session']
        location = session_info['biometric_location']
        
        # Complete the biometric authentication following the reference pattern
        try:
            # Construct the full URL for biometric authentication
            auth_url = urljoin(f'{BRAIN_API_BASE}/authentication', location)
            
            # Keep trying until biometric auth succeeds (like in reference code)
            max_attempts = 5
            attempt = 0
            
            while attempt < max_attempts:
                bio_response = brain_session.post(auth_url)
                if bio_response.status_code == 201:
                    # Biometric authentication successful
                    break
                elif bio_response.status_code == 401:
                    # Biometric authentication not complete yet
                    attempt += 1
                    if attempt >= max_attempts:
                        return jsonify({
                            'success': False,
                            'error': 'Biometric authentication not completed. Please try again.'
                        })
                    time.sleep(2)  # Wait a bit before retrying
                else:
                    # Other error
                    bio_response.raise_for_status()
            
            # Update session info - remove biometric pending status
            session_info['biometric_pending'] = False
            del session_info['biometric_location']
            
            # Create a new session ID without the biometric_pending suffix
            new_session_id = f"{session_info['username']}_{int(time.time())}"
            brain_sessions[new_session_id] = {
                'session': brain_session,
                'username': session_info['username'],
                'timestamp': time.time()
            }
            
            # Remove old session
            del brain_sessions[session_id]
            
            # Update Flask session
            flask_session['brain_session_id'] = new_session_id
            
            return jsonify({
                'success': True,
                'session_id': new_session_id,
                'message': 'Biometric authentication completed successfully'
            })
            
        except requests.HTTPError as e:
            return jsonify({
                'success': False,
                'error': f'Failed to complete biometric authentication: {str(e)}'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error completing biometric authentication: {str(e)}'
        })

@app.route('/api/operators', methods=['GET'])
def get_operators():
    """Get user operators from BRAIN API"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        session_info = brain_sessions[session_id]
        brain_session = session_info['session']
        
        # First try without pagination parameters (most APIs return all operators at once)
        try:
            response = brain_session.get(f'{BRAIN_API_BASE}/operators')
            response.raise_for_status()
            
            data = response.json()
            
            # If it's a list, we got all operators
            if isinstance(data, list):
                all_operators = data
                print(f"Fetched {len(all_operators)} operators from BRAIN API (direct)")
            # If it's a dict with results, handle pagination
            elif isinstance(data, dict) and 'results' in data:
                all_operators = []
                total_count = data.get('count', len(data['results']))
                print(f"Found {total_count} total operators, fetching all...")
                
                # Get first batch
                all_operators.extend(data['results'])
                
                # Get remaining batches if needed
                limit = 100
                offset = len(data['results'])
                
                while len(all_operators) < total_count:
                    params = {'limit': limit, 'offset': offset}
                    batch_response = brain_session.get(f'{BRAIN_API_BASE}/operators', params=params)
                    batch_response.raise_for_status()
                    batch_data = batch_response.json()
                    
                    if isinstance(batch_data, dict) and 'results' in batch_data:
                        batch_operators = batch_data['results']
                        if not batch_operators:  # No more data
                            break
                        all_operators.extend(batch_operators)
                        offset += len(batch_operators)
                    else:
                        break
                
                print(f"Fetched {len(all_operators)} operators from BRAIN API (paginated)")
            else:
                # Unknown format, treat as empty
                all_operators = []
                print("Unknown response format for operators API")
            
        except Exception as e:
            print(f"Error fetching operators: {str(e)}")
            # Fallback: try with explicit pagination
            all_operators = []
            limit = 100
            offset = 0
            
            while True:
                params = {'limit': limit, 'offset': offset}
                response = brain_session.get(f'{BRAIN_API_BASE}/operators', params=params)
                response.raise_for_status()
                
                data = response.json()
                if isinstance(data, list):
                    all_operators.extend(data)
                    if len(data) < limit:
                        break
                elif isinstance(data, dict) and 'results' in data:
                    batch_operators = data['results']
                    all_operators.extend(batch_operators)
                    if len(batch_operators) < limit:
                        break
                else:
                    break
                
                offset += limit
            
            print(f"Fetched {len(all_operators)} operators from BRAIN API (fallback)")
        
        # Extract name, category, description, definition and other fields (if available)
        filtered_operators = []
        for op in all_operators:
            operator_data = {
                'name': op['name'], 
                'category': op['category']
            }
            # Include description if available
            if 'description' in op and op['description']:
                operator_data['description'] = op['description']
            # Include definition if available
            if 'definition' in op and op['definition']:
                operator_data['definition'] = op['definition']
            # Include usage count if available  
            if 'usageCount' in op:
                operator_data['usageCount'] = op['usageCount']
            # Include other useful fields if available
            if 'example' in op and op['example']:
                operator_data['example'] = op['example']
            filtered_operators.append(operator_data)
        
        return jsonify(filtered_operators)
        
    except Exception as e:
        print(f"Error fetching operators: {str(e)}")
        return jsonify({'error': f'Failed to fetch operators: {str(e)}'}), 500

@app.route('/api/datafields', methods=['GET'])
def get_datafields():
    """Get data fields from BRAIN API"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        session_info = brain_sessions[session_id]
        brain_session = session_info['session']
        
        # Get parameters
        region = request.args.get('region', 'USA')
        delay = request.args.get('delay', '1')
        universe = request.args.get('universe', 'TOP3000')
        dataset_id = request.args.get('dataset_id', 'fundamental6')
        search = ''
        
        # Build URL template based on notebook implementation
        if len(search) == 0:
            url_template = f"{BRAIN_API_BASE}/data-fields?" + \
                f"&instrumentType=EQUITY" + \
                f"&region={region}&delay={delay}&universe={universe}&dataset.id={dataset_id}&limit=50" + \
                "&offset={x}"
            # Get count from first request
            first_response = brain_session.get(url_template.format(x=0))
            first_response.raise_for_status()
            count = first_response.json()['count']
        else:
            url_template = f"{BRAIN_API_BASE}/data-fields?" + \
                f"&instrumentType=EQUITY" + \
                f"&region={region}&delay={delay}&universe={universe}&limit=50" + \
                f"&search={search}" + \
                "&offset={x}"
            count = 100  # Default for search queries
        
        # Fetch all data fields in batches
        datafields_list = []
        for x in range(0, count, 50):
            response = brain_session.get(url_template.format(x=x))
            response.raise_for_status()
            datafields_list.append(response.json()['results'])
        
        # Flatten the list
        datafields_list_flat = [item for sublist in datafields_list for item in sublist]
        
        # Filter fields to only include necessary information
        filtered_fields = [
            {
                'id': field['id'],
                'description': field['description'],
                'type': field['type'],
                'coverage': field.get('coverage', 0),
                'userCount': field.get('userCount', 0),
                'alphaCount': field.get('alphaCount', 0)
            }
            for field in datafields_list_flat
        ]
        
        return jsonify(filtered_fields)
        
    except Exception as e:
        return jsonify({'error': f'Failed to fetch data fields: {str(e)}'}), 500

@app.route('/api/dataset-description', methods=['GET'])
def get_dataset_description():
    """Get dataset description from BRAIN API"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        session_info = brain_sessions[session_id]
        brain_session = session_info['session']
        
        # Get parameters
        region = request.args.get('region', 'USA')
        delay = request.args.get('delay', '1')
        universe = request.args.get('universe', 'TOP3000')
        dataset_id = request.args.get('dataset_id', 'analyst10')
        
        # Build URL for dataset description
        url = f"{BRAIN_API_BASE}/data-sets/{dataset_id}?" + \
              f"instrumentType=EQUITY&region={region}&delay={delay}&universe={universe}"
        
        print(f"Getting dataset description from: {url}")
        
        # Make request to BRAIN API
        response = brain_session.get(url)
        response.raise_for_status()
        
        data = response.json()
        description = data.get('description', 'No description available')
        
        print(f"Dataset description retrieved: {description[:100]}...")
        
        return jsonify({
            'success': True,
            'description': description,
            'dataset_id': dataset_id
        })
        
    except Exception as e:
        print(f"Dataset description error: {str(e)}")
        return jsonify({'error': f'Failed to get dataset description: {str(e)}'}), 500

@app.route('/api/status', methods=['GET'])
def check_status():
    """Check if session is still valid"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'valid': False})
        
        session_info = brain_sessions[session_id]
        # Check if session is not too old (24 hours)
        if time.time() - session_info['timestamp'] > 86400:
            del brain_sessions[session_id]
            return jsonify({'valid': False})
        
        # Check if biometric authentication is pending
        if session_info.get('biometric_pending'):
            return jsonify({
                'valid': False,
                'biometric_pending': True,
                'username': session_info['username'],
                'message': 'Biometric authentication pending'
            })
        
        return jsonify({
            'valid': True,
            'username': session_info['username']
        })
        
    except Exception as e:
        return jsonify({'error': f'Status check failed: {str(e)}'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout and clean up session"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if session_id and session_id in brain_sessions:
            del brain_sessions[session_id]
        
        if 'brain_session_id' in flask_session:
            flask_session.pop('brain_session_id')
        
        return jsonify({'success': True, 'message': 'Logged out successfully'})
        
    except Exception as e:
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500

@app.route('/api/test-expression', methods=['POST'])
def test_expression():
    """Test an expression using BRAIN API simulation"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        session_info = brain_sessions[session_id]
        brain_session = session_info['session']
        
        # Get the simulation data from request
        simulation_data = request.get_json()
        
        # Ensure required fields are present
        if 'type' not in simulation_data:
            simulation_data['type'] = 'REGULAR'
        
        # Ensure settings have required fields
        if 'settings' not in simulation_data:
            simulation_data['settings'] = {}
        
        # Set default values for missing settings
        default_settings = {
            'instrumentType': 'EQUITY',
            'region': 'USA',
            'universe': 'TOP3000',
            'delay': 1,
            'decay': 15,
            'neutralization': 'SUBINDUSTRY',
            'truncation': 0.08,
            'pasteurization': 'ON',
            'testPeriod': 'P1Y6M',
            'unitHandling': 'VERIFY',
            'nanHandling': 'OFF',
            'language': 'FASTEXPR',
            'visualization': False
        }
        
        for key, value in default_settings.items():
            if key not in simulation_data['settings']:
                simulation_data['settings'][key] = value
        
        # Convert string boolean values to actual boolean
        if isinstance(simulation_data['settings'].get('visualization'), str):
            viz_value = simulation_data['settings']['visualization'].lower()
            simulation_data['settings']['visualization'] = viz_value == 'true'
        
        # Send simulation request (following notebook pattern)
        try:
            message = {}
            simulation_response = brain_session.post(f'{BRAIN_API_BASE}/simulations', json=simulation_data)
            
            # Check if we got a Location header (following notebook pattern)
            if 'Location' in simulation_response.headers:
                # Follow the location to get the actual status
                message = brain_session.get(simulation_response.headers['Location']).json()
                
                # Check if simulation is running or completed
                if 'progress' in message.keys():
                    info_to_print = "Simulation is running"
                    return jsonify({
                        'success': True,
                        'status': 'RUNNING',
                        'message': info_to_print,
                        'full_response': message
                    })
                else:
                    # Return the full message as in notebook
                    return jsonify({
                        'success': message.get('status') != 'ERROR',
                        'status': message.get('status', 'UNKNOWN'),
                        'message': str(message),
                        'full_response': message
                    })
            else:
                # Try to get error from response body (following notebook pattern)
                try:
                    message = simulation_response.json()
                    return jsonify({
                        'success': False,
                        'status': 'ERROR',
                        'message': str(message),
                        'full_response': message
                    })
                except:
                    return jsonify({
                        'success': False,
                        'status': 'ERROR', 
                        'message': 'web Connection Error',
                        'full_response': {}
                    })
                    
        except Exception as e:
            return jsonify({
                'success': False,
                'status': 'ERROR',
                'message': 'web Connection Error',
                'full_response': {'error': str(e)}
            })
            
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'status': 'ERROR',
            'message': f'Test expression failed: {str(e)}',
            'full_response': {'error': str(e), 'traceback': traceback.format_exc()}
        }), 500

@app.route('/api/test-operators', methods=['GET'])
def test_operators():
    """Test endpoint to check raw BRAIN operators API response"""
    try:
        session_id = request.headers.get('Session-ID') or flask_session.get('brain_session_id')
        if not session_id or session_id not in brain_sessions:
            return jsonify({'error': 'Invalid or expired session'}), 401
        
        session_info = brain_sessions[session_id]
        brain_session = session_info['session']
        
        # Get raw response from BRAIN API
        response = brain_session.get(f'{BRAIN_API_BASE}/operators')
        response.raise_for_status()
        
        data = response.json()
        
        # Return raw response info for debugging
        result = {
            'type': str(type(data)),
            'is_list': isinstance(data, list),
            'is_dict': isinstance(data, dict),
            'length': len(data) if isinstance(data, list) else None,
            'keys': list(data.keys()) if isinstance(data, dict) else None,
            'count_key': data.get('count') if isinstance(data, dict) else None,
            'first_few_items': data[:3] if isinstance(data, list) else (data.get('results', [])[:3] if isinstance(data, dict) else None)
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500

# Import blueprints
try:
    from blueprints import idea_house_bp, paper_analysis_bp, feature_engineering_bp, inspiration_house_bp
    print("📦 Blueprints imported successfully!")
except ImportError as e:
    print(f"❌ Failed to import blueprints: {e}")
    print("Some features may not be available.")

# Register blueprints
app.register_blueprint(idea_house_bp, url_prefix='/idea-house')
app.register_blueprint(paper_analysis_bp, url_prefix='/paper-analysis')
app.register_blueprint(feature_engineering_bp, url_prefix='/feature-engineering')
app.register_blueprint(inspiration_house_bp, url_prefix='/inspiration-house')

print("🔧 All blueprints registered successfully!")
print("   - Idea House: /idea-house")
print("   - Paper Analysis: /paper-analysis") 
print("   - Feature Engineering: /feature-engineering")
print("   - Inspiration House: /inspiration-house")

# Template Management Routes
# Get the directory where this script is located for templates
script_dir = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(script_dir, 'custom_templates')

# Ensure templates directory exists
if not os.path.exists(TEMPLATES_DIR):
    os.makedirs(TEMPLATES_DIR)
    print(f"📁 Created templates directory: {TEMPLATES_DIR}")
else:
    print(f"📁 Templates directory ready: {TEMPLATES_DIR}")

print("✅ BRAIN Expression Template Decoder fully initialized!")
print("🎯 Ready to process templates and integrate with BRAIN API!")

@app.route('/api/templates', methods=['GET'])
def get_templates():
    """Get all custom templates"""
    try:
        templates = []
        templates_file = os.path.join(TEMPLATES_DIR, 'templates.json')
        
        if os.path.exists(templates_file):
            with open(templates_file, 'r', encoding='utf-8') as f:
                templates = json.load(f)
        
        return jsonify(templates)
    except Exception as e:
        return jsonify({'error': f'Error loading templates: {str(e)}'}), 500

@app.route('/api/templates', methods=['POST'])
def save_template():
    """Save a new custom template"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        description = data.get('description', '').strip()
        expression = data.get('expression', '').strip()
        template_configurations = data.get('templateConfigurations', {})
        
        if not name or not expression:
            return jsonify({'error': 'Name and expression are required'}), 400
        
        # Load existing templates
        templates_file = os.path.join(TEMPLATES_DIR, 'templates.json')
        templates = []
        
        if os.path.exists(templates_file):
            with open(templates_file, 'r', encoding='utf-8') as f:
                templates = json.load(f)
        
        # Check for duplicate names
        existing_index = next((i for i, t in enumerate(templates) if t['name'] == name), None)
        
        new_template = {
            'name': name,
            'description': description,
            'expression': expression,
            'templateConfigurations': template_configurations,
            'createdAt': datetime.now().isoformat()
        }
        
        if existing_index is not None:
            # Update existing template but preserve createdAt if it exists
            if 'createdAt' in templates[existing_index]:
                new_template['createdAt'] = templates[existing_index]['createdAt']
            new_template['updatedAt'] = datetime.now().isoformat()
            templates[existing_index] = new_template
            message = f'Template "{name}" updated successfully'
        else:
            # Add new template
            templates.append(new_template)
            message = f'Template "{name}" saved successfully'
        
        # Save to file
        with open(templates_file, 'w', encoding='utf-8') as f:
            json.dump(templates, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True, 'message': message})
        
    except Exception as e:
        return jsonify({'error': f'Error saving template: {str(e)}'}), 500

@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
def delete_template(template_id):
    """Delete a custom template"""
    try:
        templates_file = os.path.join(TEMPLATES_DIR, 'templates.json')
        templates = []
        
        if os.path.exists(templates_file):
            with open(templates_file, 'r', encoding='utf-8') as f:
                templates = json.load(f)
        
        if 0 <= template_id < len(templates):
            deleted_template = templates.pop(template_id)
            
            # Save updated templates
            with open(templates_file, 'w', encoding='utf-8') as f:
                json.dump(templates, f, indent=2, ensure_ascii=False)
            
            return jsonify({'success': True, 'message': f'Template "{deleted_template["name"]}" deleted successfully'})
        else:
            return jsonify({'error': 'Template not found'}), 404
            
    except Exception as e:
        return jsonify({'error': f'Error deleting template: {str(e)}'}), 500

@app.route('/api/templates/export', methods=['GET'])
def export_templates():
    """Export all templates as JSON"""
    try:
        templates_file = os.path.join(TEMPLATES_DIR, 'templates.json')
        templates = []
        
        if os.path.exists(templates_file):
            with open(templates_file, 'r', encoding='utf-8') as f:
                templates = json.load(f)
        
        return jsonify(templates)
        
    except Exception as e:
        return jsonify({'error': f'Error exporting templates: {str(e)}'}), 500

@app.route('/api/templates/import', methods=['POST'])
def import_templates():
    """Import templates from JSON"""
    try:
        data = request.get_json()
        imported_templates = data.get('templates', [])
        overwrite = data.get('overwrite', False)
        
        if not isinstance(imported_templates, list):
            return jsonify({'error': 'Invalid template format'}), 400
        
        # Validate template structure
        valid_templates = []
        for template in imported_templates:
            if (isinstance(template, dict) and 
                'name' in template and 'expression' in template and
                template['name'].strip() and template['expression'].strip()):
                valid_templates.append({
                    'name': template['name'].strip(),
                    'description': template.get('description', '').strip(),
                    'expression': template['expression'].strip(),
                    'templateConfigurations': template.get('templateConfigurations', {}),
                    'createdAt': template.get('createdAt', datetime.now().isoformat())
                })
        
        if not valid_templates:
            return jsonify({'error': 'No valid templates found'}), 400
        
        # Load existing templates
        templates_file = os.path.join(TEMPLATES_DIR, 'templates.json')
        existing_templates = []
        
        if os.path.exists(templates_file):
            with open(templates_file, 'r', encoding='utf-8') as f:
                existing_templates = json.load(f)
        
        # Handle duplicates
        duplicates = []
        new_templates = []
        
        for template in valid_templates:
            existing_index = next((i for i, t in enumerate(existing_templates) if t['name'] == template['name']), None)
            
            if existing_index is not None:
                duplicates.append(template['name'])
                if overwrite:
                    existing_templates[existing_index] = template
            else:
                new_templates.append(template)
        
        # Add new templates
        existing_templates.extend(new_templates)
        
        # Save to file
        with open(templates_file, 'w', encoding='utf-8') as f:
            json.dump(existing_templates, f, indent=2, ensure_ascii=False)
        
        result = {
            'success': True,
            'imported': len(new_templates),
            'duplicates': duplicates,
            'overwritten': len(duplicates) if overwrite else 0
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Error importing templates: {str(e)}'}), 500

@app.route('/api/run-simulator', methods=['POST'])
def run_simulator():
    """Run the simulator_wqb.py script"""
    try:
        import subprocess
        import threading
        from pathlib import Path
        
        # Get the script path (now in simulator subfolder)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        simulator_dir = os.path.join(script_dir, 'simulator')
        simulator_path = os.path.join(simulator_dir, 'simulator_wqb.py')
        
        # Check if the script exists
        if not os.path.exists(simulator_path):
            return jsonify({'error': 'simulator_wqb.py not found in simulator folder'}), 404
        
        # Run the script in a new terminal window
        def run_script():
            try:
                # For Windows
                if os.name == 'nt':
                    # Use subprocess with proper working directory (simulator folder)
                    subprocess.Popen(['cmd', '/k', 'python', 'simulator_wqb.py'], 
                                   cwd=simulator_dir, 
                                   creationflags=subprocess.CREATE_NEW_CONSOLE)
                else:
                    # For Unix-like systems
                    subprocess.Popen(['gnome-terminal', '--working-directory', simulator_dir, '--', 'python3', 'simulator_wqb.py'])
            except Exception as e:
                print(f"Error running simulator: {e}")
        
        # Start the script in a separate thread
        thread = threading.Thread(target=run_script)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Simulator script started in new terminal window'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to run simulator: {str(e)}'}), 500

@app.route('/api/open-submitter', methods=['POST'])
def open_submitter():
    """Run the alpha_submitter.py script"""
    try:
        import subprocess
        import threading
        from pathlib import Path
        
        # Get the script path (now in simulator subfolder)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        simulator_dir = os.path.join(script_dir, 'simulator')
        submitter_path = os.path.join(simulator_dir, 'alpha_submitter.py')
        
        # Check if the script exists
        if not os.path.exists(submitter_path):
            return jsonify({'error': 'alpha_submitter.py not found in simulator folder'}), 404
        
        # Run the script in a new terminal window
        def run_script():
            try:
                # For Windows
                if os.name == 'nt':
                    # Use subprocess with proper working directory (simulator folder)
                    subprocess.Popen(['cmd', '/k', 'python', 'alpha_submitter.py'], 
                                   cwd=simulator_dir, 
                                   creationflags=subprocess.CREATE_NEW_CONSOLE)
                else:
                    # For Unix-like systems
                    subprocess.Popen(['gnome-terminal', '--working-directory', simulator_dir, '--', 'python3', 'alpha_submitter.py'])
            except Exception as e:
                print(f"Error running submitter: {e}")
        
        # Start the script in a separate thread
        thread = threading.Thread(target=run_script)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Alpha submitter script started in new terminal window'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to open submitter: {str(e)}'}), 500

@app.route('/api/open-hk-simulator', methods=['POST'])
def open_hk_simulator():
    """Run the autosimulator.py script from hkSimulator folder"""
    try:
        import subprocess
        import threading
        from pathlib import Path
        
        # Get the script path (hkSimulator subfolder)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        hk_simulator_dir = os.path.join(script_dir, 'hkSimulator')
        autosimulator_path = os.path.join(hk_simulator_dir, 'autosimulator.py')
        
        # Check if the script exists
        if not os.path.exists(autosimulator_path):
            return jsonify({'error': 'autosimulator.py not found in hkSimulator folder'}), 404
        
        # Run the script in a new terminal window
        def run_script():
            try:
                # For Windows
                if os.name == 'nt':
                    # Use subprocess with proper working directory (hkSimulator folder)
                    subprocess.Popen(['cmd', '/k', 'python', 'autosimulator.py'], 
                                   cwd=hk_simulator_dir, 
                                   creationflags=subprocess.CREATE_NEW_CONSOLE)
                else:
                    # For Unix-like systems
                    subprocess.Popen(['gnome-terminal', '--working-directory', hk_simulator_dir, '--', 'python3', 'autosimulator.py'])
            except Exception as e:
                print(f"Error running HK simulator: {e}")
        
        # Start the script in a separate thread
        thread = threading.Thread(target=run_script)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'HK simulator script started in new terminal window'
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to open HK simulator: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting BRAIN Expression Template Decoder Web Application...")
    print("Application will run on http://localhost:5000")
    print("BRAIN API integration included - no separate proxy needed!")
    app.run(debug=True, host='0.0.0.0', port=5000) 