import requests
import json
import time
from datetime import datetime
import os
from pathlib import Path
import getpass
import msvcrt
import sys

def input_with_asterisks(prompt):
    """Input function that shows asterisks while typing password"""
    print(prompt, end='', flush=True)
    password = []
    
    try:
        while True:
            char = msvcrt.getch()
            
            # Handle Enter key
            if char in [b'\r', b'\n']:
                print()  # New line
                break
            
            # Handle Backspace
            elif char == b'\x08':  # Backspace
                if password:
                    password.pop()
                    # Move cursor back, print space, move cursor back again
                    print('\b \b', end='', flush=True)
            
            # Handle Ctrl+C
            elif char == b'\x03':  # Ctrl+C
                print()
                raise KeyboardInterrupt
            
            # Handle printable characters (ASCII)
            elif 32 <= ord(char) <= 126:  # Printable ASCII range
                password.append(char.decode('ascii'))
                print('*', end='', flush=True)
            
            # Handle extended characters (like Chinese, etc.)
            else:
                try:
                    # Try to decode as UTF-8
                    decoded_char = char.decode('utf-8')
                    if decoded_char.isprintable():
                        password.append(decoded_char)
                        print('*', end='', flush=True)
                except UnicodeDecodeError:
                    # Skip non-decodable characters
                    continue
    
    except Exception as e:
        print(f"\nError reading password: {e}")
        print("Falling back to regular input (password will be visible)")
        return input("Enter your password (visible): ")
    
    return ''.join(password)

def login(account_choice=None):
    """Login to WorldQuant Brain API"""
    s = requests.Session()
    
    # Prompt user for credentials
    print("\n=== WorldQuant Brain Login ===")
    email = input("Enter your email: ").strip()
    
    # Use custom password input with asterisk masking
    try:
        password = input_with_asterisks("Enter your password: ")
        if not password:
            print("❌ Password is required.")
            return None
    except Exception as e:
        print(f"❌ Error with custom password input: {e}")
        print("Trying standard getpass...")
        try:
            password = getpass.getpass("Enter your password: ")
            if not password:
                print("❌ Password is required.")
                return None
        except Exception as e2:
            print(f"❌ Error reading password: {e2}")
            return None
    
    if not email:
        print("❌ Email is required.")
        return None
    
    print(f"Logging in with: {email}")
    
    # Set basic auth
    s.auth = (email, password)
    
    try:
        # Send authentication request
        response = s.post('https://api.worldquantbrain.com/authentication')
        print(f"Login response status: {response.status_code}")
        print(f"Login response headers: {dict(response.headers)}")
        
        if response.text:
            try:
                response_json = response.json()
                print(f"Login response body: {json.dumps(response_json, indent=2)}")
            except json.JSONDecodeError:
                print(f"Login response body (not JSON): {response.text}")
        
        response.raise_for_status()
        print("Login successful!")
        return s
    except requests.exceptions.RequestException as e:
        print(f"Login failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Error response status: {e.response.status_code}")
            print(f"Error response body: {e.response.text}")
        return None

def check_alpha_exists(s, alpha_id):
    """Check if an alpha exists by making a GET request to /alphas/<alpha_id>"""
    try:
        response = s.get(f"https://api.worldquantbrain.com/alphas/{alpha_id}")
        print(f"Alpha check response status: {response.status_code}")
        print(f"Alpha check response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            alpha_data = response.json()
            print(f"✅ Alpha {alpha_id} exists - Type: {alpha_data.get('type', 'Unknown')}")
            print(f"Alpha data: {json.dumps(alpha_data, indent=2)}")
            return True, alpha_data
        elif response.status_code == 404:
            print(f"❌ Alpha {alpha_id} does not exist (404 Not Found)")
            if response.text:
                print(f"404 response body: {response.text}")
            return False, None
        else:
            print(f"⚠️ Unexpected response for alpha {alpha_id}: {response.status_code}")
            if response.text:
                print(f"Unexpected response body: {response.text}")
            return False, None
    except requests.exceptions.RequestException as e:
        print(f"❌ Error checking alpha {alpha_id}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Error response status: {e.response.status_code}")
            print(f"Error response body: {e.response.text}")
        return False, None

def get_alpha_recordsets(s, alpha_id):
    """Get available record sets for an alpha"""
    try:
        response = s.get(f"https://api.worldquantbrain.com/alphas/{alpha_id}/recordsets")
        print(f"Recordsets response status: {response.status_code}")
        print(f"Recordsets response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            recordsets_data = response.json()
            print(f"📊 Alpha {alpha_id} has {recordsets_data.get('count', 0)} record sets available")
            print(f"Recordsets data: {json.dumps(recordsets_data, indent=2)}")
            return recordsets_data
        else:
            print(f"⚠️ Could not fetch record sets for alpha {alpha_id}: {response.status_code}")
            if response.text:
                print(f"Recordsets error response body: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching record sets for alpha {alpha_id}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Error response status: {e.response.status_code}")
            print(f"Error response body: {e.response.text}")
        return None

def submit(s, alpha_id):
    """Submit a single alpha with retry logic - keeps trying until success"""
    
    def submit_inner(s, alpha_id):
        """Inner submit function with rate limiting handling"""
        try:
            result = s.post(f"https://api.worldquantbrain.com/alphas/{alpha_id}/submit")
            print(f"Alpha submit, alpha_id={alpha_id}, status_code={result.status_code}")
            print(f"Response headers: {dict(result.headers)}")
            
            # Handle rate limiting
            while True:
                if "retry-after" in result.headers:
                    wait_time = float(result.headers["Retry-After"])
                    print(f"Rate limited, waiting {wait_time} seconds...")
                    time.sleep(wait_time)
                    result = s.get(f"https://api.worldquantbrain.com/alphas/{alpha_id}/submit")
                    print(f"Retry GET response, status_code={result.status_code}")
                    print(f"Retry headers: {dict(result.headers)}")
                else:
                    break
            
            return result
        except Exception as e:
            print(f'Connection error: {e}, attempting to re-login...')
            new_session = login()
            if new_session is None:
                return None
            return submit_inner(new_session, alpha_id)
    
    attempt_count = 1
    result = None
    
    while True:
        print(f"Submit attempt {attempt_count} for alpha {alpha_id}")
        result = submit_inner(s, alpha_id)
        
        if result is None:
            print(f"Failed to submit {alpha_id} - connection error")
            return None
        
        if result.status_code == 200:
            print(f"✅ Alpha {alpha_id} submit successful, status_code={result.status_code}")
            return result
        elif result.status_code == 403:
            print(f"❌ Alpha {alpha_id} submit forbidden, status_code={result.status_code}")
            return result
        else:
            print(f"⚠️ Alpha submit fail, status_code={result.status_code}, alpha_id={alpha_id}, attempt {attempt_count}")
            print(f"Waiting 2 minutes before retry...")
            time.sleep(120)  # 2 minutes = 120 seconds
            attempt_count += 1
            continue

def submit_alpha(alpha_id, session=None, account_choice=None):
    """Submit a single alpha with comprehensive error handling"""
    if session is None:
        s = login(account_choice)
        if s is None:
            return False
    else:
        s = session
    
    # First check if the alpha exists
    print(f"Checking if alpha {alpha_id} exists...")
    exists, alpha_data = check_alpha_exists(s, alpha_id)
    if not exists:
        print(f"❌ Cannot submit alpha {alpha_id} - it does not exist")
        return False
    
    # Submit the alpha
    res = submit(s, alpha_id)
    
    if res is None:
        print(f"Failed to submit {alpha_id} - connection error")
        return False
    
    # Parse response
    if res.text:
        try:
            res_json = res.json()
            print(f"Submit response parsed successfully")
        except json.JSONDecodeError:
            print(f"Submit response is not JSON: {res.text[:200]}...")
            return False
    else:
        print(f"Submit response has no text content")
        return False
    
    # Check for various error conditions
    if 'detail' in res_json and res_json['detail'] == 'Not found.':
        print(f"{alpha_id} - Alpha ID not found")
        return False
    
    # Check submission status
    submitted = True
    if 'is' in res_json and 'checks' in res_json['is']:
        for item in res_json['is']['checks']:
            if item['name'] == 'ALREADY_SUBMITTED':
                submitted = False
                print(f"{alpha_id} - Already submitted")
                break
            if item['result'] == 'FAIL':
                submitted = False
                print(f"{alpha_id} - {item['name']} check failed, limit = {item['limit']}, value = {item['value']}")
                break
    
    if submitted:
        print(f'{alpha_id} - Submission successful!')
        return True
    else:
        return False

def main():
    """Main function to run the alpha submission script"""
    print("=== WorldQuant Brain Alpha Submitter ===")
    print("This script will help you submit alphas with automatic retry logic.")
    print("You will be prompted to enter your WorldQuant Brain credentials.\n")
    
    # Login with user credentials
    session = login()
    if session is None:
        print("Failed to login. Exiting.")
        return
    
    print("\n=== Alpha Submission Mode ===")
    print("Enter alpha IDs one by one. Type 'quit' to exit.")
    print("Type 'relogin' to login with different credentials.")
    print("Type 'info <alpha_id>' to check alpha details before submitting.")
    
    while True:
        alpha_id = input("\nEnter alpha ID (or 'quit' to exit, 'relogin' to change credentials): ").strip()
        
        if alpha_id.lower() == 'quit':
            print("Goodbye!")
            break
        
        if alpha_id.lower() == 'relogin':
            print("\nRe-logging in...")
            session = login()
            if session is None:
                print("Failed to login. Exiting.")
                return
            continue
        
        if alpha_id.lower().startswith('info '):
            info_alpha_id = alpha_id[5:].strip()
            if not info_alpha_id:
                print("Please provide an alpha ID after 'info'")
                continue
            
            print(f"\nChecking details for alpha: {info_alpha_id}")
            print("=" * 50)
            
            # Check if alpha exists
            exists, alpha_data = check_alpha_exists(session, info_alpha_id)
            if exists:
                # Get record sets
                get_alpha_recordsets(session, info_alpha_id)
                
                # Show some basic alpha info
                if alpha_data:
                    print(f"📋 Alpha Details:")
                    print(f"   ID: {alpha_data.get('id', 'N/A')}")
                    print(f"   Type: {alpha_data.get('type', 'N/A')}")
                    if 'settings' in alpha_data:
                        print(f"   Has settings: Yes")
                    if 'regular' in alpha_data:
                        print(f"   Has regular data: Yes")
                    if 'combo' in alpha_data:
                        print(f"   Has combo data: Yes")
                    if 'selection' in alpha_data:
                        print(f"   Has selection data: Yes")
            
            print("=" * 50)
            continue
        
        if not alpha_id:
            print("Please enter a valid alpha ID.")
            continue
        
        print(f"\nSubmitting alpha: {alpha_id}")
        print("=" * 50)
        
        success = submit_alpha(alpha_id, session)
        
        if success:
            print(f"✅ Alpha {alpha_id} processed successfully!")
        else:
            print(f"❌ Alpha {alpha_id} failed to submit properly.")
        
        print("=" * 50)

if __name__ == "__main__":
    main() 