/**
 * BRAIN Alpha Simulator - Frontend JavaScript
 * Handles the user interface for the simulator with parameter input and log monitoring
 */

let currentLogFile = null;
let logPollingInterval = null;
let isSimulationRunning = false;
let simulationAbortController = null;
let userSelectedLogFile = false; // Track if user manually selected a log file

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    refreshLogFiles();
    setupFormValidation();
    loadSimulatorDefaults();
});

/**
 * Setup form validation and change handlers
 */
function setupFormValidation() {
    const startPosition = document.getElementById('startPosition');
    const randomShuffle = document.getElementById('randomShuffle');
    const jsonFile = document.getElementById('jsonFile');
    
    // Show warning when file might be overwritten
    function checkOverwriteWarning() {
        const warning = document.getElementById('overwriteWarning');
        const showWarning = parseInt(startPosition.value) > 0 || randomShuffle.checked;
        warning.style.display = showWarning ? 'block' : 'none';
    }
    
    startPosition.addEventListener('input', checkOverwriteWarning);
    randomShuffle.addEventListener('change', checkOverwriteWarning);
    
    // Handle folder/file selection
    jsonFile.addEventListener('change', function(e) {
        const files = e.target.files;
        const info = document.getElementById('jsonFileInfo');
        
        if (files.length > 0) {
            const jsonFiles = Array.from(files).filter(file => file.name.endsWith('.json'));
            
            if (jsonFiles.length > 0) {
                info.innerHTML = `
                    <strong>Selected Folder:</strong> ${jsonFiles.length} .json file(s) found.<br>
                    <ul style="margin-top: 5px; padding-left: 20px; font-size: 11px;">
                        ${jsonFiles.slice(0, 10).map(f => `<li>${f.name} (${(f.size / 1024).toFixed(1)} KB)</li>`).join('')}
                        ${jsonFiles.length > 10 ? '<li>... and more</li>' : ''}
                    </ul>
                `;
                 // Reset start position for batch mode, as it's handled by checkpoints
                document.getElementById('startPosition').value = 0;
            } else {
                info.innerHTML = '<span style="color: #721c24;">❌ No .json files found in the selected folder.</span>';
            }
            info.style.display = 'block';
        } else {
            info.style.display = 'none';
        }
    });
}

/**
 * Load default values from localStorage if available
 */
function loadSimulatorDefaults() {
    const username = localStorage.getItem('simulator_username');
    if (username) {
        document.getElementById('username').value = username;
    }
    
    const concurrentCount = localStorage.getItem('simulator_concurrent');
    if (concurrentCount) {
        document.getElementById('concurrentCount').value = concurrentCount;
    }
}

/**
 * Save current form values to localStorage
 */
function saveSimulatorDefaults() {
    localStorage.setItem('simulator_username', document.getElementById('username').value);
    localStorage.setItem('simulator_concurrent', document.getElementById('concurrentCount').value);
}

/**
 * Toggle password visibility
 */
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    
    const toggleBtn = document.querySelector('.password-toggle');
    toggleBtn.textContent = isPassword ? '🙈' : '👁️';
}

/**
 * Toggle multi-simulation options
 */
function toggleMultiSimOptions() {
    const checkbox = document.getElementById('useMultiSim');
    const options = document.getElementById('multiSimOptions');
    options.style.display = checkbox.checked ? 'block' : 'none';
}

/**
 * Refresh available log files
 */
async function refreshLogFiles() {
    try {
        const response = await fetch('/api/simulator/logs');
        const data = await response.json();
        
        const selector = document.getElementById('logSelector');
        selector.innerHTML = '<option value="">Select a log file...</option>';
        
        if (data.logs && data.logs.length > 0) {
            data.logs.forEach(log => {
                const option = document.createElement('option');
                option.value = log.filename;
                option.textContent = `${log.filename} (${log.size}, ${log.modified})`;
                selector.appendChild(option);
            });
            
            // Auto-select the latest log file only if user hasn't manually selected one
            if (data.latest && !userSelectedLogFile) {
                selector.value = data.latest;
                currentLogFile = data.latest;
                // Update UI to show auto-monitoring
                document.getElementById('currentLogFile').innerHTML = `
                    <strong>🔄 Auto-monitoring:</strong> ${data.latest}<br>
                    <small>Latest log file will be automatically selected when new ones appear.</small>
                `;
                loadSelectedLog();
                // Ensure polling is active for auto-selected files too
                ensureLogPollingActive();
            }
        }
    } catch (error) {
        console.error('Error refreshing log files:', error);
        updateStatus('Error loading log files', 'error');
    }
    
    // Ensure polling continues after refresh
    ensureLogPollingActive();
}

/**
 * Load selected log file content
 */
async function loadSelectedLog() {
    const selector = document.getElementById('logSelector');
    const selectedLog = selector.value;
    
    if (!selectedLog) {
        // Reset if user deselects
        userSelectedLogFile = false;
        currentLogFile = null;
        document.getElementById('currentLogFile').innerHTML = `
            <strong>🔄 Auto-mode enabled:</strong> Will monitor latest log when available<br>
            <small>System will automatically select and monitor the newest log file.</small>
        `;
        // Try to auto-select latest again
        refreshLogFiles();
        return;
    }
    
    // Mark that user has manually selected a log file
    userSelectedLogFile = true;
    currentLogFile = selectedLog;
    
    // Start polling if not already running to monitor the selected file
    ensureLogPollingActive();
    
    try {
        const response = await fetch(`/api/simulator/logs/${encodeURIComponent(selectedLog)}`);
        const data = await response.json();
        
                        if (data.content !== undefined) {
                    const logViewer = document.getElementById('logViewer');
                    // Use innerHTML to properly handle character encoding for Chinese text
                    const content = data.content || 'Log file is empty.';
                    logViewer.textContent = content;
                    logViewer.scrollTop = logViewer.scrollHeight;
            
            // Only update status if user manually selected (not auto-selected)
            if (userSelectedLogFile) {
                document.getElementById('currentLogFile').innerHTML = `
                    <strong>📌 Manually selected:</strong> ${selectedLog}<br>
                    <small>Auto-switching to latest log disabled. Select "Select a log file..." to re-enable.</small>
                `;
            }
        }
    } catch (error) {
        console.error('Error loading log file:', error);
        updateStatus('Error loading log content', 'error');
    }
}

/**
 * Test connection to BRAIN API
 */
async function testConnection() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        updateStatus('Please enter username and password first', 'error');
        return;
    }
    
    const testBtn = document.getElementById('testBtn');
    testBtn.disabled = true;
    testBtn.textContent = '🔄 Testing...';
    
    updateStatus('Testing BRAIN API connection...', 'running');
    
    try {
        const response = await fetch('/api/simulator/test-connection', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            updateStatus('✅ Connection successful! Ready to run simulation.', 'success');
            saveSimulatorDefaults();
        } else {
            updateStatus(`❌ Connection failed: ${data.error}`, 'error');
        }
    } catch (error) {
        updateStatus(`❌ Connection error: ${error.message}`, 'error');
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = '🔗 Test Connection';
    }
}

/**
 * Run the simulator with user parameters
 */
async function runSimulator() {
    if (isSimulationRunning) {
        updateStatus('A simulation process is already running.', 'error');
        return;
    }

    const form = document.getElementById('simulatorForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const files = document.getElementById('jsonFile').files;
    if (files.length === 0) {
        updateStatus('Please select a folder containing .json files.', 'error');
        return;
    }

    const jsonFiles = Array.from(files).filter(file => file.name.endsWith('.json'));
    if (jsonFiles.length === 0) {
        updateStatus('No .json files found in the selected folder.', 'error');
        return;
    }

    // UI updates for running state
    isSimulationRunning = true;
    const runBtn = document.getElementById('runSimulator');
    runBtn.disabled = true;
    runBtn.textContent = '🔄 Processing...';
    updateStatus('Starting batch simulation...', 'running');
    showProgress(true);

    try {
        saveSimulatorDefaults();

        // Read all files' content
        const fileContents = await Promise.all(
            jsonFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = e => resolve({ name: file.name, content: e.target.result });
                    reader.onerror = e => reject(new Error(`Failed to read file: ${file.name}`));
                    reader.readAsText(file);
                });
            })
        );

        const payload = {
            files: fileContents,
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            concurrentCount: parseInt(document.getElementById('concurrentCount').value),
            useMultiSim: document.getElementById('useMultiSim').checked,
            alphaCountPerSlot: parseInt(document.getElementById('alphaCountPerSlot').value)
        };

        const response = await fetch('/api/batch/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            updateStatus('✅ Batch process started in a new window! Check the new terminal for progress.', 'success');
            showLaunchInfo({
                expressions_count: `Batch of ${jsonFiles.length} files`,
                concurrent_count: payload.concurrentCount,
                use_multi_sim: payload.useMultiSim,
                alpha_count_per_slot: payload.alphaCountPerSlot
            });
             // Start monitoring log files to catch logs from the new process
            startLogPolling();
            setTimeout(() => {
                userSelectedLogFile = false; // Re-enable auto-selection of latest log
                refreshLogFiles();
            }, 5000); // Wait 5 seconds for the new log file to be created
        } else {
            updateStatus(`❌ Failed to start batch process: ${data.error}`, 'error');
        }

    } catch (error) {
        updateStatus(`❌ An error occurred: ${error.message}`, 'error');
    } finally {
        isSimulationRunning = false;
        runBtn.disabled = false;
        runBtn.textContent = '🚀 Start Simulation';
        showProgress(false);
    }
}

/**
 * Stop running simulation
 */
async function stopSimulation() {
    if (simulationAbortController) {
        simulationAbortController.abort();
    }
    
    try {
        await fetch('/api/simulator/stop', { method: 'POST' });
    } catch (error) {
        console.error('Error stopping simulation:', error);
    }
    
    updateStatus('Stopping simulation...', 'idle');
}

/**
 * Ensure log polling is active if we have a log file to monitor
 */
function ensureLogPollingActive() {
    if (currentLogFile && !logPollingInterval) {
        console.log('Starting log polling for file:', currentLogFile);
        startLogPolling();
        
        // Add visual indicator that polling is active
        const currentLogFileDiv = document.getElementById('currentLogFile');
        if (userSelectedLogFile) {
            currentLogFileDiv.innerHTML = `
                <strong>📌 Manually selected:</strong> ${currentLogFile} <span style="color: #28a745;">●</span><br>
                <small>Auto-switching to latest log disabled. Select "Select a log file..." to re-enable.</small>
            `;
        } else {
            currentLogFileDiv.innerHTML = `
                <strong>🔄 Auto-monitoring:</strong> ${currentLogFile} <span style="color: #28a745;">●</span><br>
                <small>Latest log file will be automatically selected when new ones appear.</small>
            `;
        }
    } else if (currentLogFile && logPollingInterval) {
        console.log('Log polling already active for:', currentLogFile);
    }
}

/**
 * Start polling for log updates
 */
function startLogPolling() {
    if (logPollingInterval) {
        clearInterval(logPollingInterval);
    }
    
    // Start more frequent polling when simulation is running in terminal
    logPollingInterval = setInterval(async () => {
        try {
            // Only refresh log file list if user hasn't manually selected a file
            // This allows the system to detect new log files but won't interfere with user's choice
            if (!userSelectedLogFile) {
                await refreshLogFiles();
            }
            
            // Always refresh the content of the currently monitored log file
            if (currentLogFile) {
                console.log('Polling log file:', currentLogFile, 'User selected:', userSelectedLogFile);
                const response = await fetch(`/api/simulator/logs/${encodeURIComponent(currentLogFile)}`);
                const data = await response.json();
                
                if (data.content !== undefined) {
                    const logViewer = document.getElementById('logViewer');
                    logViewer.textContent = data.content;
                    logViewer.scrollTop = logViewer.scrollHeight;
                }
            }
        } catch (error) {
            console.error('Error polling log:', error);
        }
    }, 3000); // Poll every 3 seconds when running in terminal
    
    // Auto-stop polling after 15 minutes to prevent excessive server load
    setTimeout(() => {
        if (logPollingInterval) {
            clearInterval(logPollingInterval);
            logPollingInterval = null;
            console.log('Auto-stopped log polling after 15 minutes');
        }
    }, 900000); // 15 minutes
}

/**
 * Stop log polling
 */
function stopLogPolling() {
    if (logPollingInterval) {
        clearInterval(logPollingInterval);
        logPollingInterval = null;
    }
}

/**
 * Update status indicator
 */
function updateStatus(message, type = 'idle') {
    const statusEl = document.getElementById('simulatorStatus');
    statusEl.textContent = message;
    statusEl.className = `status-indicator status-${type}`;
}

/**
 * Show/hide progress bar
 */
function showProgress(show) {
    const progressDiv = document.getElementById('simulationProgress');
    progressDiv.style.display = show ? 'block' : 'none';
    
    if (!show) {
        updateProgress(0, 0);
    }
}

/**
 * Update progress bar
 */
function updateProgress(current, total) {
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    
    progressText.textContent = `${current}/${total}`;
    
    if (total > 0) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
    } else {
        progressBar.style.width = '0%';
    }
}

/**
 * Show launch information when simulator starts in terminal
 */
function showLaunchInfo(parameters) {
    const resultsPanel = document.getElementById('resultsPanel');
    const resultsDiv = document.getElementById('simulationResults');
    
    let html = '<div class="launch-info">';
    html += '<h4>🚀 Simulator Launched Successfully</h4>';
    html += '<p>The simulator is running in a separate terminal window. You can monitor the progress there.</p>';
    
    html += '<div class="parameters-summary">';
    html += '<h5>📋 Configuration Summary:</h5>';
    html += `<p><strong>Total Expressions:</strong> ${parameters.expressions_count}</p>`;
    html += `<p><strong>Concurrent Simulations:</strong> ${parameters.concurrent_count}</p>`;
    
    if (parameters.use_multi_sim) {
        html += `<p><strong>Multi-Simulation Mode:</strong> Yes (${parameters.alpha_count_per_slot} alphas per slot)</p>`;
    } else {
        html += `<p><strong>Multi-Simulation Mode:</strong> No</p>`;
    }
    html += '</div>';
    
    html += '<div class="monitoring-info" style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 4px;">';
    html += '<p><strong>💡 Monitoring Tips:</strong></p>';
    html += '<ul style="margin: 5px 0; padding-left: 20px;">';
    html += '<li>Watch the terminal window for real-time progress</li>';
    html += '<li>Log files will be updated automatically below</li>';
    html += '<li>Simulation results will appear in the terminal when complete</li>';
    html += '<li>You can refresh log files manually using the refresh button</li>';
    html += '</ul>';
    html += '</div>';
    
    html += '</div>';
    
    resultsDiv.innerHTML = html;
    resultsPanel.style.display = 'block';
    
    // Scroll to results
    resultsPanel.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Show simulation results
 */
function showResults(results) {
    const resultsPanel = document.getElementById('resultsPanel');
    const resultsDiv = document.getElementById('simulationResults');
    
    let html = '<div class="results-summary">';
    html += `<p><strong>Total Simulations:</strong> ${results.total || 0}</p>`;
    html += `<p><strong>Successful:</strong> ${results.successful || 0}</p>`;
    html += `<p><strong>Failed:</strong> ${results.failed || 0}</p>`;
    
    // Add multi-simulation information if applicable
    if (results.use_multi_sim && results.alpha_count_per_slot) {
        html += `<div class="info-box" style="margin: 10px 0;">`;
        html += `<strong>📌 Multi-Simulation Mode:</strong><br>`;
        html += `Each simulation slot contains ${results.alpha_count_per_slot} alphas.<br>`;
        html += `Total individual alphas processed: <strong>${results.successful * results.alpha_count_per_slot}</strong>`;
        html += `</div>`;
    }
    
    html += '</div>';
    
    if (results.alphaIds && results.alphaIds.length > 0) {
        html += '<h4>Generated Alpha IDs:</h4>';
        html += '<div class="alpha-ids" style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">';
        results.alphaIds.forEach((alphaId, index) => {
            html += `<div>${index + 1}. ${alphaId}</div>`;
        });
        html += '</div>';
        
        // Add copy button for alpha IDs
        html += '<div style="margin-top: 10px;">';
        html += '<button class="btn btn-outline btn-small" onclick="copyAlphaIds()">📋 Copy All Alpha IDs</button>';
        html += '</div>';
    }
    
    resultsDiv.innerHTML = html;
    resultsPanel.style.display = 'block';
    
    // Store results for copying
    window.lastSimulationResults = results;
    
    // Scroll to results
    resultsPanel.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Copy all alpha IDs to clipboard
 */
function copyAlphaIds() {
    if (window.lastSimulationResults && window.lastSimulationResults.alphaIds) {
        const alphaIds = window.lastSimulationResults.alphaIds.join('\n');
        navigator.clipboard.writeText(alphaIds).then(() => {
            updateStatus('✅ Alpha IDs copied to clipboard!', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            updateStatus('❌ Failed to copy Alpha IDs', 'error');
        });
    }
}

/**
 * Handle page unload - cleanup polling
 */
window.addEventListener('beforeunload', function() {
    stopLogPolling();
    if (simulationAbortController) {
        simulationAbortController.abort();
    }
});