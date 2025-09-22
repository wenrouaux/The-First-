/**
 * BRAIN API Integration Module
 * Handles authentication, operators, and data fields from WorldQuant BRAIN
 * Now uses a local Python proxy server to bypass CORS restrictions
 */

// BRAIN session and data storage
let brainSession = null;
let brainOperators = null;
let brainDataFields = null;
let brainSessionId = localStorage.getItem('brain_session_id');

// Flask app API endpoints
const PROXY_BASE = '';

// Open BRAIN login modal
function openBrainLoginModal() {
    const modal = document.getElementById('brainLoginModal');
    const statusDiv = document.getElementById('brainLoginStatus');
    statusDiv.innerHTML = '';
    statusDiv.className = 'login-status';
    
    // Clear previous inputs
    document.getElementById('brainUsername').value = '';
    document.getElementById('brainPassword').value = '';
    
    modal.style.display = 'block';
    document.getElementById('brainUsername').focus();
}

// Close BRAIN login modal
function closeBrainLoginModal() {
    const modal = document.getElementById('brainLoginModal');
    const loginBtn = document.getElementById('loginBtn');
    
    // Don't allow closing if login is in progress
    if (loginBtn.disabled) {
        return;
    }
    
    // Clean up any biometric authentication buttons
    const statusDiv = document.getElementById('brainLoginStatus');
    const completeBtn = statusDiv.querySelector('button');
    if (completeBtn) {
        completeBtn.remove();
    }
    
    modal.style.display = 'none';
}

// Authenticate with BRAIN via proxy server
async function authenticateBrain() {
    const username = document.getElementById('brainUsername').value.trim();
    const password = document.getElementById('brainPassword').value;
    const statusDiv = document.getElementById('brainLoginStatus');
    const loginBtn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const modal = document.getElementById('brainLoginModal');
    
    if (!username || !password) {
        showLoginStatus('Please enter both username and password.', 'error');
        return;
    }
    
    // Disable all inputs and buttons
    document.getElementById('brainUsername').disabled = true;
    document.getElementById('brainPassword').disabled = true;
    document.getElementById('cancelBtn').disabled = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Connecting...';
    
    // Show spinner
    spinner.style.display = 'block';
    
    // Disable modal closing
    modal.querySelector('.close').style.display = 'none';
    
    // Show loading state
    showLoginStatus('Connecting to proxy server...', 'loading');
    
    try {
        showLoginStatus('Authenticating with BRAIN...', 'loading');
        
        // Authenticate via proxy server
        const authResponse = await fetch(`${PROXY_BASE}/api/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });
        
        const authData = await authResponse.json();
        
        // Check if biometric authentication is required
        if (authData.requires_biometric) {
            showLoginStatus('Biometric authentication required. Opening BRAIN website...', 'loading');
            
            // Open biometric URL in new tab
            window.open(authData.biometric_url, '_blank');
            
            // Store the session ID for biometric completion
            brainSessionId = authData.session_id;
            localStorage.setItem('brain_session_id', brainSessionId);
            
            showLoginStatus('Please complete biometric authentication in the new tab, then click "Complete Authentication" below.', 'info');
            
            // Show complete authentication button
            const completeBtn = document.createElement('button');
            completeBtn.textContent = 'Complete Authentication';
            completeBtn.className = 'btn btn-secondary';
            completeBtn.style.marginTop = '10px';
            completeBtn.onclick = completeBiometricAuth;
            
            const statusDiv = document.getElementById('brainLoginStatus');
            statusDiv.appendChild(completeBtn);
            
            return;
        }
        
        if (!authResponse.ok) {
            throw new Error(authData.error || 'Authentication failed');
        }
        
        brainSessionId = authData.session_id;
        brainSession = { authenticated: true, username: username };
        
        // Store session ID in localStorage for other pages
        localStorage.setItem('brain_session_id', brainSessionId);
        
        // Fetch operators immediately for "Op" button functionality
        showLoginStatus('Loading operators...', 'loading');
        brainOperators = await getUserOperators();
        
        // Store operators in sessionStorage for other pages (like Inspiration House)
        sessionStorage.setItem('brainOperators', JSON.stringify(brainOperators));
        
        // Update UI to show connected state
        updateConnectedState();
        showLoginStatus(`Successfully connected! Loaded ${brainOperators.length} operators.`, 'success');
        
        // Disable buttons to prevent further clicks
        loginBtn.disabled = true;
        document.getElementById('brainUsername').disabled = true;
        document.getElementById('brainPassword').disabled = true;
        
        // Close modal after a short delay
        setTimeout(() => {
            // Re-enable everything before closing
            document.getElementById('brainUsername').disabled = false;
            document.getElementById('brainPassword').disabled = false;
            document.getElementById('cancelBtn').disabled = false;
            loginBtn.disabled = false;
            loginBtn.textContent = 'Connect';
            spinner.style.display = 'none';
            modal.querySelector('.close').style.display = 'block';
            
            closeBrainLoginModal();
        }, 1500);
        
    } catch (error) {
        console.error('BRAIN authentication failed:', error);
        showLoginStatus(`Connection failed: ${error.message}`, 'error');
        brainSession = null;
        brainSessionId = null;
    } finally {
        // Re-enable everything
        document.getElementById('brainUsername').disabled = false;
        document.getElementById('brainPassword').disabled = false;
        document.getElementById('cancelBtn').disabled = false;
        loginBtn.disabled = false;
        loginBtn.textContent = 'Connect';
        spinner.style.display = 'none';
        modal.querySelector('.close').style.display = 'block';
    }
}

// Complete biometric authentication
async function completeBiometricAuth() {
    const statusDiv = document.getElementById('brainLoginStatus');
    
    try {
        showLoginStatus('Verifying biometric authentication...', 'loading');
        
        const response = await fetch(`${PROXY_BASE}/api/complete-biometric`, {
            method: 'POST',
            headers: {
                'Session-ID': brainSessionId
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            brainSessionId = data.session_id;
            brainSession = { authenticated: true };
            localStorage.setItem('brain_session_id', brainSessionId);
            
            // Fetch operators
            showLoginStatus('Loading operators...', 'loading');
            brainOperators = await getUserOperators();
            
            // Store operators in sessionStorage for other pages (like Inspiration House)
            sessionStorage.setItem('brainOperators', JSON.stringify(brainOperators));
            
            // Update UI
            updateConnectedState();
            showLoginStatus(`Successfully connected! Loaded ${brainOperators.length} operators.`, 'success');
            
            // Close modal after delay
            setTimeout(() => {
                closeBrainLoginModal();
            }, 1500);
        } else {
            showLoginStatus(`Biometric verification failed: ${data.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Biometric completion failed:', error);
        showLoginStatus(`Biometric verification failed: ${error.message}`, 'error');
    }
}

// Get user operators via proxy server
async function getUserOperators() {
    if (!brainSession || !brainSessionId) {
        throw new Error('Not authenticated with BRAIN');
    }
    
    try {
        const response = await fetch(`${PROXY_BASE}/api/operators`, {
            method: 'GET',
            headers: {
                'Session-ID': brainSessionId
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch operators');
        }
        
        const operators = await response.json();
        console.log(`Received ${operators.length} operators from BRAIN API`);
        
        // Log the categories to verify we have all operator types
        const categories = [...new Set(operators.map(op => op.category))].sort();
        console.log(`Operator categories: ${categories.join(', ')}`);
        
        return operators;
        
    } catch (error) {
        console.error('Failed to fetch operators:', error);
        throw error;
    }
}

// Get data fields via proxy server
async function getDataFields(region = 'USA', delay = 1, universe = 'TOP3000', datasetId = 'fundamental6') {
    if (!brainSession || !brainSessionId) {
        throw new Error('Not authenticated with BRAIN');
    }
    
    try {
        const params = new URLSearchParams({
            region: region,
            delay: delay.toString(),
            universe: universe,
            dataset_id: datasetId
        });
        
        const response = await fetch(`${PROXY_BASE}/api/datafields?${params}`, {
            method: 'GET',
            headers: {
                'Session-ID': brainSessionId
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch data fields');
        }
        
        return await response.json();
        
    } catch (error) {
        console.error('Failed to fetch data fields:', error);
        throw error;
    }
}

// Update UI to show connected state
function updateConnectedState() {
    // Update connect button if it exists (main page)
    const connectBtn = document.getElementById('connectToBrain');
    if (connectBtn) {
        connectBtn.textContent = 'Connected to BRAIN';
        connectBtn.className = 'btn btn-brain connected';
    }
    
    // Show connection info in the grammar errors area if it exists (main page)
    const errorsDiv = document.getElementById('grammarErrors');
    if (errorsDiv) {
        errorsDiv.innerHTML = `<div class="success-message">
            ✓ Successfully connected to WorldQuant BRAIN<br>
            <strong>Username:</strong> ${brainSession.username}<br>
            <strong>Operators loaded:</strong> ${brainOperators ? brainOperators.length : 0}<br>
            <em>Data fields will be loaded when needed.</em>
        </div>`;
        
        // Auto-hide the message after 5 seconds
        setTimeout(() => {
            if (errorsDiv.innerHTML.includes('Successfully connected')) {
                errorsDiv.innerHTML = '';
            }
        }, 5000);
    }
}

// Show login status message
function showLoginStatus(message, type) {
    const statusDiv = document.getElementById('brainLoginStatus');
    statusDiv.textContent = message;
    statusDiv.className = `login-status ${type}`;
}

// Check if connected to BRAIN
function isConnectedToBrain() {
    return brainSession !== null && brainSessionId !== null;
}

// Get all available operators (fetch on-demand)
async function getAllOperators() {
    if (!brainOperators && isConnectedToBrain()) {
        try {
            brainOperators = await getUserOperators();
            // Store operators in sessionStorage for other pages (like Inspiration House)
            sessionStorage.setItem('brainOperators', JSON.stringify(brainOperators));
        } catch (error) {
            console.error('Failed to fetch operators on-demand:', error);
            return [];
        }
    }
    return brainOperators || [];
}

// Get loaded operators synchronously (for UI components)
function getLoadedOperators() {
    return brainOperators || [];
}

// Get all available data fields (fetch on-demand)
async function getAllDataFields() {
    if (!brainDataFields && isConnectedToBrain()) {
        try {
            brainDataFields = await getDataFields();
        } catch (error) {
            console.error('Failed to fetch data fields on-demand:', error);
            return [];
        }
    }
    return brainDataFields || [];
}

// Get operators by category (with on-demand loading)
async function getOperatorsByCategory(category) {
    const operators = await getAllOperators();
    return operators.filter(op => op.category === category);
}

// Search operators (with on-demand loading)
async function searchOperators(searchTerm) {
    const operators = await getAllOperators();
    const term = searchTerm.toLowerCase();
    return operators.filter(op => 
        op.name.toLowerCase().includes(term) || 
        op.category.toLowerCase().includes(term)
    );
}

// Search data fields (with on-demand loading)
async function searchDataFields(searchTerm) {
    const dataFields = await getAllDataFields();
    const term = searchTerm.toLowerCase();
    return dataFields.filter(field => 
        field.id.toLowerCase().includes(term) || 
        field.description.toLowerCase().includes(term)
    );
}

// Logout from BRAIN
async function logoutFromBrain() {
    if (brainSessionId) {
        try {
            await fetch(`${PROXY_BASE}/api/logout`, {
                method: 'POST',
                headers: {
                    'Session-ID': brainSessionId
                }
            });
        } catch (error) {
            console.warn('Failed to logout from proxy server:', error);
        }
    }
    
    // Clear local session data
    brainSession = null;
    brainSessionId = null;
    brainOperators = null;
    brainDataFields = null;
    
    // Clear localStorage and sessionStorage
    localStorage.removeItem('brain_session_id');
    sessionStorage.removeItem('brainOperators');
    
    // Update UI
    const connectBtn = document.getElementById('connectToBrain');
    if (connectBtn) {
        connectBtn.textContent = 'Connect to BRAIN';
        connectBtn.className = 'btn btn-brain';
    }
}

// Check session validity on page load
async function checkSessionValidity() {
    if (brainSessionId) {
        try {
            const response = await fetch(`${PROXY_BASE}/api/status`, {
                method: 'GET',
                headers: {
                    'Session-ID': brainSessionId
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.valid) {
                    brainSession = { authenticated: true, username: data.username };
                    // Update UI to show connected state
                    updateConnectedState();
                } else {
                    // Session expired, clear it
                    localStorage.removeItem('brain_session_id');
                    brainSessionId = null;
                }
            }
        } catch (error) {
            console.warn('Failed to check session validity:', error);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', checkSessionValidity);

// Export functions for use in other modules
window.brainAPI = {
    openBrainLoginModal,
    closeBrainLoginModal,
    authenticateBrain,
    isConnectedToBrain,
    getAllOperators,
    getAllDataFields,
    getDataFields,
    getOperatorsByCategory,
    searchOperators,
    searchDataFields,
    logoutFromBrain,
    getLoadedOperators
};

// Also make key functions globally available for HTML onclick handlers
window.openBrainLoginModal = openBrainLoginModal;
window.closeBrainLoginModal = closeBrainLoginModal;
window.authenticateBrain = authenticateBrain; 