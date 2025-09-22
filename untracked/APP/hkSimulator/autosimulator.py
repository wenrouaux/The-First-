import sys
import subprocess
# --- Dependency Check & Auto-Install ---
required_imports = [
    ("getpass", None),
    ("json", None),
    ("logging", None),
    ("os", None),
    ("threading", None),
    ("time", None),
    ("functools", None),
    ("multiprocessing", None),
    ("pathlib", None),
    ("typing", None),
    ("urllib.parse", None),
    ("pandas", "pandas"),
    ("requests", "requests"),
    ("tqdm", "tqdm"),
    ("pandas.io.formats.style", "pandas"),
]
for mod, pipname in required_imports:
    try:
        if "." in mod:
            __import__(mod.split(".")[0])
        else:
            __import__(mod)
    except ImportError:
        if pipname:
            print(f"Installing missing package: {pipname}")
            subprocess.check_call([sys.executable, "-m", "pip", "install", pipname])
        else:
            print(f"Module {mod} is a built-in or not installable via pip.")
# --- Script Description ---
"""
Autosimulator for WorldQuant BRAIN platform
- Timestamped logger
- Authentication with biometric check
- User-specified alpha JSON input
- Single/multi simulation mode
- Simulation worker: sends jobs, retries, saves locations
- Result worker: fetches results, saves to JSON
"""
import os
import sys
import time
import json
import threading
import logging
from datetime import datetime
from pathlib import Path
import msvcrt
import requests
from ace_lib import (
    check_session_and_relogin,
    simulate_single_alpha,
    simulate_multi_alpha,
)

# --- Logger Setup ---
def setup_logger():
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    log_filename = f'autosim_{timestamp}.log'
    logger = logging.getLogger(f'autosim_{timestamp}')
    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    fh = logging.FileHandler(log_filename)
    fh.setFormatter(formatter)
    logger.addHandler(fh)
    ch = logging.StreamHandler()
    ch.setFormatter(formatter)
    logger.addHandler(ch)
    return logger, log_filename

logger, log_filename = setup_logger()

# --- Authentication ---
def check_session_timeout(s):
    """
    Check if the current session has timed out.

    Args:
        s (SingleSession): The current session object.

    Returns:
        int: The number of seconds until the session expires, or 0 if the session has expired or an error occurred.
    """
    brain_api_url = os.environ.get("BRAIN_API_URL", "https://api.worldquantbrain.com")
    authentication_url = brain_api_url + "/authentication"
    try:
        result = s.get(authentication_url).json()["token"]["expiry"]
        logger.debug(f"Session (ID: {id(s)}) timeout check result: {result}")
        return result
    except Exception:
        logger.error(f"Session timeout check failed for session (ID: {id(s)})")
        return 0
def get_credentials():
    email = input("Email: ").strip()
    print("Password: ", end='', flush=True)
    password = ''
    while True:
        ch = msvcrt.getch()
        if ch in (b'\r', b'\n'):
            print()
            break
        elif ch == b'\x08':  # Backspace
            if len(password) > 0:
                password = password[:-1]
                print('\b \b', end='', flush=True)
        elif ch == b'\x03':  # Ctrl+C
            raise KeyboardInterrupt
        else:
            password += ch.decode('utf-8', errors='ignore')
            print('*', end='', flush=True)
    return (email, password)

def authenticate():
    from ace_lib import SingleSession
    session = SingleSession()
    session.auth = get_credentials()
    brain_api_url = os.environ.get("BRAIN_API_URL", "https://api.worldquantbrain.com")
    r = session.post(brain_api_url + "/authentication")
    logger.debug(f"New session created (ID: {id(session)}) with authentication response: {r.status_code}, {r.json()}")
    if r.status_code == requests.status_codes.codes.unauthorized:
        if r.headers.get("WWW-Authenticate") == "persona":
            print(
                "Complete biometrics authentication and press any key to continue: \n"
                + r.url + "/persona?inquiry=" + r.headers.get("Location", "")
                + "\n"
            )
            input()
            session.post(r.headers.get("Location", r.url))
            while True:
                if session.post(r.headers.get("Location", r.url)).status_code != 201:
                    input(
                        "Biometrics authentication is not complete. Please try again and press any key when completed \n"
                    )
                else:
                    break
        else:
            logger.error("\nIncorrect email or password\n")
            return authenticate()
    return session

# --- User Input ---
MASTER_LOG_PATH = "autosim_master_log.json"

def update_master_log(input_json_path, latest_index):
    """
    Update the master log file with the latest successful index for the given input file name.
    """
    import os, json
    file_name = os.path.basename(input_json_path)
    log_data = {}
    # Read existing log if present
    if os.path.exists(MASTER_LOG_PATH):
        try:
            with open(MASTER_LOG_PATH, "r", encoding="utf-8") as f:
                log_data = json.load(f)
        except Exception:
            log_data = {}
    # Update with latest index
    log_data[file_name] = latest_index
    # Atomic write
    tmp_path = MASTER_LOG_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2)
    os.replace(tmp_path, MASTER_LOG_PATH)
def get_user_json():
    import re
    while True:
        raw_path = input('Enter path to alpha JSON file: ').strip()
        json_path = re.sub(r'^["\']+|["\']+$', '', raw_path.strip())
        if os.path.exists(json_path):
            try:
                with open(json_path, 'r') as f:
                    alpha_list = json.load(f)
                # Check master log for previous progress
                file_name = os.path.basename(json_path)
                start_index = 0
                if os.path.exists(MASTER_LOG_PATH):
                    try:
                        with open(MASTER_LOG_PATH, 'r', encoding='utf-8') as logf:
                            log_data = json.load(logf)
                        if file_name in log_data:
                            last_index = log_data[file_name]
                            print(f'Last time you simulated to position {last_index}.')
                            resp = input(f'Do you want to start from {last_index + 1}? (Y/n) Or enter another starting index: ').strip()
                            if resp.lower() in ['', 'y', 'yes']:
                                start_index = last_index + 1
                            elif resp.isdigit():
                                start_index = int(resp)
                            else:
                                print('Invalid input, starting from 0.')
                                start_index = 0
                    except Exception:
                        pass
                # Slice alpha_list to start from chosen index
                class AlphaList(list):
                    pass
                alpha_list = AlphaList(alpha_list[start_index:])
                alpha_list._start_index = start_index
                return alpha_list, json_path
            except Exception as e:
                logger.error(f'Error reading JSON file: {e}')
        else:
            logger.error(f'JSON file not found: {json_path}')
        print('Please enter a valid path to your alpha JSON file.')

def get_simulation_mode():
    mode = input('Select simulation mode (single/multi): ').strip().lower()
    if mode not in ['single', 'multi']:
        logger.error('Invalid mode. Choose "single" or "multi".')
        sys.exit(1)
    batch_size = None
    if mode == 'multi':
        while True:
            try:
                batch_size = int(input('Enter number of elements per multi-simulation batch (2-10): ').strip())
                if 2 <= batch_size <= 10:
                    break
                else:
                    print('Batch size must be between 2 and 10.')
            except Exception:
                print('Please enter a valid integer between 2 and 10.')
    return mode, batch_size

def get_retry_timeout():
    try:
        timeout = int(input('Enter retry timeout in seconds (default 60): ').strip())
        if timeout < 1:
            timeout = 60
    except Exception:
        timeout = 60
    return timeout

# --- Simulation Worker ---
def simulation_worker(session, alpha_list, mode, json_path, location_path, retry_timeout, batch_size=None):
    locations = {}
    # Initialize sent_count from user starting index (passed via alpha_list attribute if set)
    file_name = os.path.basename(json_path)
    sent_count = getattr(alpha_list, '_start_index', 0)
    while alpha_list:
        # Check session timeout before proceeding
        if check_session_timeout(session) == 0:
            logger.error('Session expired. Stopping simulation worker.')
            break
        session = check_session_and_relogin(session)
        # Prepare batch but do NOT pop yet
        if mode == 'single':
            batch = [alpha_list[0]]
        else:
            size = batch_size if batch_size else min(10, max(2, len(alpha_list)))
            batch = [alpha_list[i] for i in range(min(size, len(alpha_list)))]
        try:
            from ace_lib import start_simulation
            location = None
            while location is None:
                # Check session timeout before each send
                if check_session_timeout(session) == 0:
                    logger.error('Session expired. Stopping simulation worker.')
                    return
                if mode == 'single':
                    response = start_simulation(session, batch[0])
                    location = response.headers.get('Location')
                else:
                    response = start_simulation(session, batch)
                    location = response.headers.get('Location')
                if location is None:
                    logger.info(f'Simulation sent, location(s) saved: None')
                    logger.info(f'No location received, waiting {retry_timeout} seconds and retrying...')
                    time.sleep(retry_timeout)
            # Only pop/remove after location is valid
            if mode == 'single':
                alpha_list.pop(0)
                sent_count += 1
                update_master_log(json_path, sent_count - 1)
            else:
                for _ in range(len(batch)):
                    alpha_list.pop(0)
                sent_count += len(batch)
                update_master_log(json_path, sent_count - 1)
            locations[str(time.time())] = location
            with open(location_path, 'w') as f:
                json.dump(locations, f, indent=2)
            # Do NOT overwrite the input JSON file
            logger.info(f'Simulation sent, location(s) saved: {location}')
        except Exception as e:
            logger.error(f'Simulation error: {e}. Retrying in {retry_timeout} seconds.')
            time.sleep(retry_timeout)

# --- Result Worker ---
def result_worker(session, location_path, result_path, poll_interval=30):
    results = {}
    from time import sleep
    while True:
        # Check session timeout before proceeding
        if check_session_timeout(session) == 0:
            logger.error('Session expired. Stopping result worker.')
            break
        session = check_session_and_relogin(session)
        if not os.path.exists(location_path):
            time.sleep(poll_interval)
            continue
        with open(location_path, 'r') as f:
            locations = json.load(f)
        for loc_key, loc_val in locations.items():
            if loc_key in results:
                continue
            if not loc_val or not isinstance(loc_val, str) or not loc_val.startswith('http'):
                logger.error(f'Invalid or missing location for key {loc_key}: {loc_val}')
                continue
            try:
                # Check session timeout before each result fetch
                if check_session_timeout(session) == 0:
                    logger.error('Session expired. Stopping result worker.')
                    return
                simulation_progress_url = loc_val
                while True:
                    simulation_progress = session.get(simulation_progress_url)
                    retry_after = simulation_progress.headers.get("Retry-After", 0)
                    if float(retry_after) == 0:
                        break
                    logger.info(f"Sleeping for {retry_after} seconds for location {simulation_progress_url}")
                    sleep(float(retry_after))
                sim_json = simulation_progress.json()
                # Multi-simulation: check for children
                if "children" in sim_json and sim_json.get("status") == "COMPLETE":
                    child_results = {}
                    for child_id in sim_json["children"]:
                        child_url = f"https://api.worldquantbrain.com/simulations/{child_id}"
                        child_resp = session.get(child_url)
                        child_json = child_resp.json()
                        alpha_id = child_json.get("alpha")
                        if not alpha_id:
                            logger.error(f"No alpha_id found for child {child_id}")
                            child_results[child_id] = {"error": "No alpha_id found"}
                        else:
                            alpha = session.get(f"https://api.worldquantbrain.com/alphas/{alpha_id}")
                            child_results[child_id] = alpha.json()
                    results[loc_key] = {"multi_children": child_results}
                    logger.info(f"Multi-simulation results fetched for location {loc_val}")
                else:
                    # Single simulation
                    alpha_id = sim_json.get("alpha")
                    if not alpha_id:
                        logger.error(f"No alpha_id found for location {simulation_progress_url}")
                        results[loc_key] = {"error": "No alpha_id found"}
                    else:
                        alpha = session.get(f"https://api.worldquantbrain.com/alphas/{alpha_id}")
                        results[loc_key] = alpha.json()
                    logger.info(f"Result fetched for location {loc_val}")
                with open(result_path, 'w') as f:
                    json.dump(results, f, indent=2)
            except Exception as e:
                logger.error(f'Error fetching result for {loc_val}: {e}')
        time.sleep(poll_interval)

# --- Main ---
def main():
    session = authenticate()
    alpha_list, json_path = get_user_json()
    mode, batch_size = get_simulation_mode()
    retry_timeout = get_retry_timeout()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    location_path = f'autosim_locations_{timestamp}.json'
    result_path = f'autosim_results_{timestamp}.json'
    # Start workers
    sim_thread = threading.Thread(target=simulation_worker, args=(session, alpha_list, mode, json_path, location_path, retry_timeout, batch_size))
    res_thread = threading.Thread(target=result_worker, args=(session, location_path, result_path))
    sim_thread.start()
    res_thread.start()
    sim_thread.join()
    # Result worker runs until all locations processed
    logger.info('Simulation worker finished. Waiting for results...')
    res_thread.join()

if __name__ == '__main__':
    main()
