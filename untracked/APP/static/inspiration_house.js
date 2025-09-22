// Inspiration House JavaScript

// Store API key and state in session storage
let apiKey = sessionStorage.getItem('deepseekApiKey');
let modelProvider = sessionStorage.getItem('inspirationHouseProvider') || 'deepseek';
let modelName = sessionStorage.getItem('inspirationHouseModelName') || 'deepseek-chat';
let researchTarget = sessionStorage.getItem('inspirationHouseTarget') || '';
let currentExpression = sessionStorage.getItem('inspirationHouseExpression') || '';
let expressionContext = sessionStorage.getItem('inspirationHouseContext') || '';
let evaluationResults = JSON.parse(sessionStorage.getItem('inspirationHouseResults')) || [];
let operatorsList = JSON.parse(sessionStorage.getItem('brainOperators')) || [];
let isEvaluating = false;
let evaluationProgress = 0;
let totalOperators = 0;
let batchSize = parseInt(sessionStorage.getItem('inspirationHouseBatchSize')) || 100; // Configurable batch size

// DOM Elements
const modelProviderSelect = document.getElementById('modelProvider');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const batchSizeInput = document.getElementById('batchSize');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiConfigSection = document.getElementById('apiConfigSection');
const showApiConfigSection = document.getElementById('showApiConfigSection');
const showApiConfigBtn = document.getElementById('showApiConfig');
const editTargetBtn = document.getElementById('editTarget');
const targetDisplay = document.getElementById('targetDisplay');
const targetText = document.getElementById('targetText');
const targetInputGroup = document.getElementById('targetInputGroup');
const researchTargetInput = document.getElementById('researchTarget');
const saveTargetBtn = document.getElementById('saveTarget');
const cancelTargetBtn = document.getElementById('cancelTarget');
const currentExpressionInput = document.getElementById('currentExpression');
const expressionContextInput = document.getElementById('expressionContext');
const loadFromBRAINBtn = document.getElementById('loadFromBRAIN');
const startEvaluationBtn = document.getElementById('startEvaluation');
const refreshEvaluationBtn = document.getElementById('refreshEvaluation');
const exportResultsBtn = document.getElementById('exportResults');
const clearResultsBtn = document.getElementById('clearResults');
const evaluationTableBody = document.getElementById('evaluationTableBody');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressCount = document.getElementById('progressCount');
const summaryStats = document.getElementById('summaryStats');
const highScoreCount = document.getElementById('highScoreCount');
const mediumScoreCount = document.getElementById('mediumScoreCount');
const lowScoreCount = document.getElementById('lowScoreCount');
const totalEvaluated = document.getElementById('totalEvaluated');
const minScoreFilter = document.getElementById('minScoreFilter');
const maxScoreFilter = document.getElementById('maxScoreFilter');
const minScoreValue = document.getElementById('minScoreValue');
const maxScoreValue = document.getElementById('maxScoreValue');
const showHighScores = document.getElementById('showHighScores');
const showMediumScores = document.getElementById('showMediumScores');
const showLowScores = document.getElementById('showLowScores');
const exportHighScoresBtn = document.getElementById('exportHighScores');
const exportAllResultsBtn = document.getElementById('exportAllResults');
const exportCSVBtn = document.getElementById('exportCSV');
const currentBatchSizeSpan = document.getElementById('currentBatchSize');

// Initialize API key if exists
if (apiKey) {
    apiKeyInput.value = apiKey;
}

// Initialize model provider and name
modelProviderSelect.value = modelProvider;
modelNameInput.value = modelName;

// Initialize batch size
batchSizeInput.value = batchSize;
currentBatchSizeSpan.textContent = operatorsList.length;

// Update model name placeholder based on provider
function updateModelNamePlaceholder() {
    const provider = modelProviderSelect.value;
    if (provider === 'kimi') {
        modelNameInput.placeholder = 'e.g., kimi-k2-0711-preview';
        if (modelNameInput.value === 'deepseek-chat') {
            modelNameInput.value = 'kimi-k2-0711-preview';
        }
    } else {
        modelNameInput.placeholder = 'e.g., deepseek-chat, deepseek-coder';
        if (modelNameInput.value === 'kimi-k2-0711-preview') {
            modelNameInput.value = 'deepseek-chat';
        }
    }
}

// Model provider change handler
modelProviderSelect.addEventListener('change', () => {
    modelProvider = modelProviderSelect.value;
    sessionStorage.setItem('inspirationHouseProvider', modelProvider);
    updateModelNamePlaceholder();
});

// Model name change handler
modelNameInput.addEventListener('input', () => {
    modelName = modelNameInput.value;
    sessionStorage.setItem('inspirationHouseModelName', modelName);
});

// Save batch size when changed
batchSizeInput.addEventListener('change', () => {
    batchSize = parseInt(batchSizeInput.value) || 100;
    sessionStorage.setItem('inspirationHouseBatchSize', batchSize.toString());
    console.log(`Batch size updated to: ${batchSize}`);
});

// Initialize placeholder on page load
updateModelNamePlaceholder();

// Check if API is already configured and hide config section if so
function checkApiConfigStatus() {
    if (apiKey && modelProvider && modelName) {
        apiConfigSection.style.display = 'none';
        showApiConfigSection.style.display = 'block';
    } else {
        apiConfigSection.style.display = 'block';
        showApiConfigSection.style.display = 'none';
    }
}

// Show API Config button event listener
showApiConfigBtn.addEventListener('click', () => {
    apiConfigSection.style.display = 'block';
    showApiConfigSection.style.display = 'none';
});

// Load existing state on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Loading Inspiration House state...');
    console.log('Research target:', researchTarget);
    console.log('Current expression:', currentExpression);
    console.log('Evaluation results:', evaluationResults);
    console.log('Operators list length:', operatorsList.length);
    
    // Check API config status
    checkApiConfigStatus();
    
    // Load saved state
    if (researchTarget) {
        targetText.textContent = researchTarget;
    }
    
    if (currentExpression) {
        currentExpressionInput.value = currentExpression;
    }
    
    if (expressionContext) {
        expressionContextInput.value = expressionContext;
    }
    
    // Check for operators in sessionStorage (from brain.js)
    refreshOperatorsFromSessionStorage();
    
    // Update operator count display
    currentBatchSizeSpan.textContent = operatorsList.length;
    
    // Load operators if not already loaded
    if (operatorsList.length === 0) {
        loadOperatorsFromBRAIN();
    }
    
    // Add a fallback message if no operators are available
    if (operatorsList.length === 0) {
        console.log('No operators loaded yet. Will load when BRAIN is connected.');
    }
    
    // Display existing results
    if (evaluationResults.length > 0) {
        displayEvaluationResults();
        updateSummaryStats();
    }
    
    // Setup filter event listeners
    setupFilters();
});

// Function to refresh operators from sessionStorage (called after BRAIN login)
function refreshOperatorsFromSessionStorage() {
    const storedOperators = sessionStorage.getItem('brainOperators');
    if (storedOperators) {
        try {
            operatorsList = JSON.parse(storedOperators);
            currentBatchSizeSpan.textContent = operatorsList.length;
            console.log(`Refreshed ${operatorsList.length} operators from sessionStorage`);
        } catch (error) {
            console.error('Error parsing operators from sessionStorage:', error);
        }
    }
}

// Save API Key and Test Connection
saveApiKeyBtn.addEventListener('click', async () => {
    const newApiKey = apiKeyInput.value.trim();
    const newProvider = modelProviderSelect.value;
    const newModelName = modelNameInput.value.trim();
    
    if (!newApiKey) {
        showNotification('Please enter a valid API key', 'error');
        return;
    }
    
    if (!newModelName) {
        showNotification('Please enter a model name', 'error');
        return;
    }

    try {
        showLoading('Testing API connection...');
        
        const response = await fetch('/inspiration-house/api/test-deepseek', {
            method: 'POST',
            headers: {
                'X-API-Key': newApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                provider: newProvider,
                model_name: newModelName
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            sessionStorage.setItem('deepseekApiKey', newApiKey);
            sessionStorage.setItem('inspirationHouseProvider', newProvider);
            sessionStorage.setItem('inspirationHouseModelName', newModelName);
            apiKey = newApiKey;
            modelProvider = newProvider;
            modelName = newModelName;
            showNotification(`${newProvider.charAt(0).toUpperCase() + newProvider.slice(1)} API connection successful`, 'success');
            
            // Hide API config section after successful configuration
            apiConfigSection.style.display = 'none';
            showApiConfigSection.style.display = 'block';
        } else {
            showNotification(`API Error: ${data.error || 'Unknown error'}`, 'error');
            console.error('API Error Details:', data);
            
            // Provide specific guidance for Kimi API issues
            if (newProvider === 'kimi' && data.error) {
                console.log('Kimi API troubleshooting tips:');
                console.log('1. Make sure you have a valid Kimi API key');
                console.log('2. Check if your Kimi account has API access enabled');
                console.log('3. Verify the model name is correct (e.g., kimi-k2-0711-preview)');
                console.log('4. Ensure you have sufficient API credits/quota');
            }
        }
    } catch (error) {
        showNotification('Error testing API connection: ' + error.message, 'error');
        console.error('API Test Error:', error);
    } finally {
        hideLoading();
    }
});

// Target Management
editTargetBtn.addEventListener('click', () => {
    targetDisplay.style.display = 'none';
    targetInputGroup.style.display = 'block';
    researchTargetInput.value = researchTarget;
    researchTargetInput.focus();
});

saveTargetBtn.addEventListener('click', () => {
    const newTarget = researchTargetInput.value.trim();
    if (!newTarget) {
        showNotification('Please enter a research target', 'error');
        return;
    }
    
    researchTarget = newTarget;
    targetText.textContent = researchTarget;
    sessionStorage.setItem('inspirationHouseTarget', researchTarget);
    
    targetDisplay.style.display = 'block';
    targetInputGroup.style.display = 'none';
    
    showNotification('Research target saved successfully', 'success');
});

cancelTargetBtn.addEventListener('click', () => {
    targetDisplay.style.display = 'block';
    targetInputGroup.style.display = 'none';
    researchTargetInput.value = researchTarget;
});

// Expression Management
currentExpressionInput.addEventListener('input', () => {
    currentExpression = currentExpressionInput.value;
    sessionStorage.setItem('inspirationHouseExpression', currentExpression);
});

expressionContextInput.addEventListener('input', () => {
    expressionContext = expressionContextInput.value;
    sessionStorage.setItem('inspirationHouseContext', expressionContext);
});

// Load from BRAIN
loadFromBRAINBtn.addEventListener('click', () => {
    if (!sessionStorage.getItem('brain_session_id')) {
        // Use the same login modal as the main page
        if (window.brainAPI && window.brainAPI.openBrainLoginModal) {
            window.brainAPI.openBrainLoginModal();
        } else {
            showNotification('BRAIN login not available. Please go to the main page to connect to BRAIN.', 'error');
            return;
        }
        
        // Set up a listener for when operators are loaded (after successful login)
        const checkOperatorsInterval = setInterval(() => {
            const storedOperators = sessionStorage.getItem('brainOperators');
            if (storedOperators) {
                clearInterval(checkOperatorsInterval);
                refreshOperatorsFromSessionStorage();
                showNotification(`Loaded ${operatorsList.length} operators from BRAIN`, 'success');
            }
        }, 1000);
        
        // Stop checking after 30 seconds
        setTimeout(() => {
            clearInterval(checkOperatorsInterval);
        }, 30000);
    } else {
        // Load current expression from BRAIN (placeholder for now)
        showNotification('Loading from BRAIN...', 'warning');
        // TODO: Implement BRAIN expression loading
    }
});

// Start AI Evaluation
startEvaluationBtn.addEventListener('click', async () => {
    if (!apiKey) {
        showNotification('Please configure your Deepseek API key first', 'error');
        return;
    }

    if (!researchTarget) {
        showNotification('Please set a research target first', 'error');
        return;
    }

    if (!currentExpression) {
        showNotification('Please enter your current expression', 'error');
        return;
    }

    if (operatorsList.length === 0) {
        showNotification('No operators available. Please connect to BRAIN first to load operators.', 'warning');
        return;
    }

    if (isEvaluating) {
        showNotification('Evaluation already in progress', 'warning');
        return;
    }

    try {
        isEvaluating = true;
        startEvaluationBtn.disabled = true;
        startEvaluationBtn.textContent = 'Evaluating...';
        
        showProgressSection();
        evaluationResults = [];
        
        // Update progress to show batch processing
        progressText.textContent = `Evaluating ${totalOperators} operators with batch size ${batchSize}...`;
        progressCount.textContent = `0 / ${totalOperators}`;
        progressFill.style.width = '0%';
        progressFill.textContent = 'Starting...';
        
        await evaluateAllOperators();
        
        // Update progress to show completion
        progressFill.style.width = '100%';
        progressFill.textContent = '100%';
        progressCount.textContent = `${totalOperators} / ${totalOperators}`;
        progressText.textContent = 'Evaluation completed!';
        
        showNotification('Evaluation completed successfully', 'success');
    } catch (error) {
        showNotification('Error during evaluation: ' + error.message, 'error');
        console.error('Evaluation Error:', error);
    } finally {
        isEvaluating = false;
        startEvaluationBtn.disabled = false;
        startEvaluationBtn.textContent = 'Start AI Evaluation';
        hideProgressSection();
    }
});

// Evaluate all operators using multithreading
async function evaluateAllOperators() {
    totalOperators = operatorsList.length;
    evaluationProgress = 0;
    
    console.log(`Starting evaluation of ${totalOperators} operators with ${totalOperators} workers...`);
    
    // Use the new batch evaluation endpoint for better performance
    try {
        const response = await fetch('/inspiration-house/api/batch-evaluate', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operators: operatorsList,
                research_target: researchTarget,
                current_expression: currentExpression,
                expression_context: expressionContext,
                batch_size: batchSize,
                provider: modelProvider,
                model_name: modelName
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            evaluationResults = data.results;
            console.log(`Batch evaluation completed. Processed ${evaluationResults.length} operators with ${data.workers_used} workers`);
            showNotification(`Evaluation completed! Processed ${evaluationResults.length} operators using ${data.workers_used} parallel workers`, 'success');
        } else {
            console.error('Batch evaluation failed:', data.error);
            showNotification(`Evaluation failed: ${data.error}`, 'error');
            return;
        }
    } catch (error) {
        console.error('Error in batch evaluation:', error);
        showNotification(`Evaluation error: ${error.message}`, 'error');
        return;
    }
    
    // Save results
    saveEvaluationResults();
    
    // Display results
    displayEvaluationResults();
    updateSummaryStats();
    
    console.log(`Evaluation completed. Processed ${evaluationResults.length} operators.`);
}

// Evaluate a single operator
async function evaluateSingleOperator(operator) {
    try {
        const response = await fetch('/inspiration-house/api/evaluate-operator', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operator: operator,
                research_target: researchTarget,
                current_expression: currentExpression,
                expression_context: expressionContext,
                provider: modelProvider,
                model_name: modelName
            })
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            return {
                operator: operator.name,
                category: operator.category || 'Unknown',
                score: data.score,
                reason: data.reason,
                timestamp: new Date().toISOString()
            };
        } else {
            console.error(`API Error for operator ${operator.name}:`, data.error);
            return {
                operator: operator.name,
                category: operator.category || 'Unknown',
                score: 0,
                reason: `Error: ${data.error || 'Unknown error'}`,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.error(`Network error for operator ${operator.name}:`, error);
        return {
            operator: operator.name,
            category: operator.category || 'Unknown',
            score: 0,
            reason: `Network error: ${error.message}`,
            timestamp: new Date().toISOString()
        };
    }
}

// Load operators from BRAIN
async function loadOperatorsFromBRAIN() {
    try {
        const response = await fetch('/api/operators');
        const data = await response.json();
        
        if (response.ok && Array.isArray(data)) {
            operatorsList = data;
            sessionStorage.setItem('brainOperators', JSON.stringify(operatorsList));
            currentBatchSizeSpan.textContent = operatorsList.length;
            console.log(`Loaded ${operatorsList.length} operators from BRAIN`);
            showNotification(`Loaded ${operatorsList.length} operators from BRAIN`, 'success');
        } else {
            console.error('Failed to load operators:', data.error);
            if (data.error && data.error.includes('Invalid or expired session')) {
                showNotification('Please connect to BRAIN first to load operators', 'warning');
            } else {
                showNotification('Failed to load operators from BRAIN', 'error');
            }
        }
    } catch (error) {
        console.error('Error loading operators:', error);
        showNotification('Error connecting to BRAIN API', 'error');
    }
}

// Convert markdown to HTML for better display
function convertMarkdownToHTML(text) {
    if (!text) return '';
    
    return text
        // Bold text: **text** -> <strong>text</strong>
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text: *text* -> <em>text</em>
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code: `text` -> <code>text</code>
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // Headers: ### text -> <h4>text</h4>
        .replace(/^### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^## (.+)$/gm, '<h3>$1</h3>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        // Lists: - item -> <li>item</li>
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        // Numbered lists: 1. item -> <li>item</li>
        .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
        // Line breaks: \n -> <br>
        .replace(/\n/g, '<br>')
        // Escape HTML characters
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Restore our HTML tags
        .replace(/&lt;strong&gt;/g, '<strong>')
        .replace(/&lt;\/strong&gt;/g, '</strong>')
        .replace(/&lt;em&gt;/g, '<em>')
        .replace(/&lt;\/em&gt;/g, '</em>')
        .replace(/&lt;code&gt;/g, '<code>')
        .replace(/&lt;\/code&gt;/g, '</code>')
        .replace(/&lt;br&gt;/g, '<br>')
        .replace(/&lt;h[234]&gt;/g, '<$1>')
        .replace(/&lt;\/h[234]&gt;/g, '</$1>')
        .replace(/&lt;li&gt;/g, '<li>')
        .replace(/&lt;\/li&gt;/g, '</li>');
}

// Display evaluation results
function displayEvaluationResults() {
    if (evaluationResults.length === 0) {
        evaluationTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #7f8c8d; font-style: italic; padding: 40px;">
                    No evaluations yet. Set your target and expression, then click "Start AI Evaluation".
                </td>
            </tr>
        `;
        return;
    }

    // Apply filters
    const filteredResults = applyFilters(evaluationResults);
    
    // Sort by score (highest first)
    filteredResults.sort((a, b) => b.score - a.score);
    
    evaluationTableBody.innerHTML = filteredResults.map(result => {
        // Find the operator details from the operators list
        const operatorDetails = operatorsList.find(op => op.name === result.operator);
        const description = operatorDetails ? operatorDetails.description || '' : '';
        const definition = operatorDetails ? operatorDetails.definition || '' : '';
        
        return `
            <tr>
                <td>
                    <div class="operator-name">${result.operator}</div>
                    <div class="operator-category">${result.category}</div>
                    ${description ? `<div class="operator-description">${convertMarkdownToHTML(description)}</div>` : ''}
                    ${definition ? `<div class="operator-definition"><strong>Definition:</strong> ${convertMarkdownToHTML(definition)}</div>` : ''}
                </td>
                <td>${result.category}</td>
                <td class="score-cell ${getScoreClass(result.score)}">${result.score}/10</td>
                <td>
                    <div class="reason-text">${convertMarkdownToHTML(result.reason)}</div>
                </td>
                <td>
                    <button class="btn btn-small" onclick="reevaluateOperator('${result.operator}')">Re-evaluate</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Apply filters to results
function applyFilters(results) {
    const minScore = parseInt(minScoreFilter.value);
    const maxScore = parseInt(maxScoreFilter.value);
    
    return results.filter(result => {
        const score = result.score;
        
        // Score range filter
        if (score < minScore || score > maxScore) {
            return false;
        }
        
        // Score category filters
        if (score >= 8 && !showHighScores.checked) return false;
        if (score >= 4 && score < 8 && !showMediumScores.checked) return false;
        if (score < 4 && !showLowScores.checked) return false;
        
        return true;
    });
}

// Get CSS class for score
function getScoreClass(score) {
    if (score >= 8) return 'score-high';
    if (score >= 4) return 'score-medium';
    return 'score-low';
}

// Setup filter event listeners
function setupFilters() {
    minScoreFilter.addEventListener('input', () => {
        minScoreValue.textContent = minScoreFilter.value;
        displayEvaluationResults();
    });
    
    maxScoreFilter.addEventListener('input', () => {
        maxScoreValue.textContent = maxScoreFilter.value;
        displayEvaluationResults();
    });
    
    showHighScores.addEventListener('change', displayEvaluationResults);
    showMediumScores.addEventListener('change', displayEvaluationResults);
    showLowScores.addEventListener('change', displayEvaluationResults);
}

// Update progress display
function updateProgress() {
    const percentage = Math.round((evaluationProgress / totalOperators) * 100);
    progressFill.style.width = `${percentage}%`;
    progressFill.textContent = `${percentage}%`;
    progressCount.textContent = `${evaluationProgress} / ${totalOperators}`;
    progressText.textContent = `Evaluating operators with ${totalOperators} parallel workers... (${percentage}% complete)`;
}

// Show/hide progress section
function showProgressSection() {
    progressSection.style.display = 'block';
}

function hideProgressSection() {
    progressSection.style.display = 'none';
}

// Update summary statistics
function updateSummaryStats() {
    if (evaluationResults.length === 0) {
        summaryStats.style.display = 'none';
        return;
    }
    
    const highScores = evaluationResults.filter(r => r.score >= 8).length;
    const mediumScores = evaluationResults.filter(r => r.score >= 4 && r.score < 8).length;
    const lowScores = evaluationResults.filter(r => r.score < 4).length;
    
    highScoreCount.textContent = highScores;
    mediumScoreCount.textContent = mediumScores;
    lowScoreCount.textContent = lowScores;
    totalEvaluated.textContent = evaluationResults.length;
    
    summaryStats.style.display = 'grid';
}

// Save evaluation results
function saveEvaluationResults() {
    sessionStorage.setItem('inspirationHouseResults', JSON.stringify(evaluationResults));
}

// Refresh evaluation results
refreshEvaluationBtn.addEventListener('click', () => {
    displayEvaluationResults();
    updateSummaryStats();
});

// Clear results
clearResultsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all evaluation results?')) {
        evaluationResults = [];
        sessionStorage.removeItem('inspirationHouseResults');
        displayEvaluationResults();
        updateSummaryStats();
        showNotification('Results cleared', 'success');
    }
});

// Export functions
exportResultsBtn.addEventListener('click', () => {
    exportResults('all');
});

exportHighScoresBtn.addEventListener('click', () => {
    exportResults('high');
});

exportAllResultsBtn.addEventListener('click', () => {
    exportResults('all');
});

exportCSVBtn.addEventListener('click', () => {
    exportResults('csv');
});

function exportResults(type) {
    let dataToExport = evaluationResults;
    
    if (type === 'high') {
        dataToExport = evaluationResults.filter(r => r.score >= 8);
    }
    
    if (dataToExport.length === 0) {
        showNotification('No results to export', 'warning');
        return;
    }
    
    if (type === 'csv') {
        exportAsCSV(dataToExport);
    } else {
        exportAsJSON(dataToExport);
    }
}

function exportAsJSON(data) {
    const exportData = {
        timestamp: new Date().toISOString(),
        research_target: researchTarget,
        current_expression: currentExpression,
        expression_context: expressionContext,
        results: data
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration_house_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Results exported as JSON', 'success');
}

function exportAsCSV(data) {
    const headers = ['Operator', 'Category', 'Score', 'Reason', 'Timestamp'];
    const csvContent = [
        headers.join(','),
        ...data.map(result => [
            `"${result.operator}"`,
            `"${result.category}"`,
            result.score,
            `"${result.reason.replace(/"/g, '""')}"`,
            `"${result.timestamp}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration_house_results_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Results exported as CSV', 'success');
}

// Re-evaluate a single operator
async function reevaluateOperator(operatorName) {
    const operator = operatorsList.find(op => op.name === operatorName);
    if (!operator) {
        showNotification('Operator not found', 'error');
        return;
    }
    
    try {
        showLoading(`Re-evaluating ${operatorName}...`);
        
        const result = await evaluateSingleOperator(operator);
        
        // Update existing result
        const index = evaluationResults.findIndex(r => r.operator === operatorName);
        if (index !== -1) {
            evaluationResults[index] = result;
        } else {
            evaluationResults.push(result);
        }
        
        saveEvaluationResults();
        displayEvaluationResults();
        updateSummaryStats();
        
        showNotification(`${operatorName} re-evaluated successfully`, 'success');
    } catch (error) {
        showNotification(`Error re-evaluating ${operatorName}: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// Make function global
window.reevaluateOperator = reevaluateOperator;

// Utility Functions
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 8000);
}

let loadingElement = null;

function showLoading(message) {
    loadingElement = document.createElement('div');
    loadingElement.className = 'loading-overlay';
    loadingElement.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
    `;
    document.body.appendChild(loadingElement);
}

function hideLoading() {
    if (loadingElement) {
        loadingElement.remove();
        loadingElement = null;
    }
}

// BRAIN Login Modal Functions are now handled by brain.js
// The modal and authentication functions are accessed via window.brainAPI 