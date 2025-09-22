// Paper Analysis JavaScript

// Store API key in session storage
let apiKey = sessionStorage.getItem('deepseekApiKey');

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const fileInput = document.getElementById('paperFile');
const fileInfo = document.getElementById('fileInfo');
const analyzeBtn = document.getElementById('analyzePaper');
const resultsSection = document.querySelector('.results-section');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const exportBtn = document.getElementById('exportResults');

// Initialize API key if exists
if (apiKey) {
    apiKeyInput.value = apiKey;
}

// Save API Key and Test Connection
saveApiKeyBtn.addEventListener('click', async () => {
    const newApiKey = apiKeyInput.value.trim();
    if (!newApiKey) {
        showNotification('Please enter a valid API key', 'error');
        return;
    }

    try {
        showLoading('Testing API connection...');
        
        const response = await fetch('/paper-analysis/api/test-deepseek', {
            method: 'POST',
            headers: {
                'X-API-Key': newApiKey,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
            sessionStorage.setItem('deepseekApiKey', newApiKey);
            apiKey = newApiKey;
            showNotification('API connection successful', 'success');
        } else {
            showNotification(`API Error: ${data.error || 'Unknown error'}`, 'error');
            console.error('API Error Details:', data);
        }
    } catch (error) {
        showNotification('Error testing API connection: ' + error.message, 'error');
        console.error('API Test Error:', error);
    } finally {
        hideLoading();
    }
});

// File Upload Handling
fileInput.addEventListener('change', handleFileSelect);
document.querySelector('.file-upload-container').addEventListener('dragover', handleDragOver);
document.querySelector('.file-upload-container').addEventListener('drop', handleFileDrop);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        updateFileInfo(file);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('drag-over');
}

function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    const file = event.dataTransfer.files[0];
    if (file) {
        fileInput.files = event.dataTransfer.files;
        updateFileInfo(file);
    }
}

function updateFileInfo(file) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    fileInfo.innerHTML = `
        <strong>File:</strong> ${file.name}<br>
        <strong>Size:</strong> ${sizeInMB} MB<br>
        <strong>Type:</strong> ${file.type || 'Unknown'}
    `;
}

// Tab Navigation
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');
        
        // Update active states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${tabName}Tab`).classList.add('active');
    });
});

// Paper Analysis
analyzeBtn.addEventListener('click', async () => {
    if (!apiKey) {
        showNotification('Please configure your Deepseek API key first', 'error');
        return;
    }

    if (!fileInput.files[0]) {
        showNotification('Please select a file to analyze', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('extract_keywords', document.getElementById('extractKeywords').checked);
    formData.append('generate_summary', document.getElementById('generateSummary').checked);
    formData.append('find_related', document.getElementById('findRelatedWorks').checked);

    try {
        showLoading('Analyzing paper...');
        
        const response = await fetch('/paper-analysis/api/analyze-paper', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey
            },
            body: formData
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            // Show detailed error message
            const errorMessage = responseData.error || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        displayResults(responseData);
        hideLoading();
        resultsSection.style.display = 'block';
        showNotification('Analysis completed successfully', 'success');
    } catch (error) {
        hideLoading();
        console.error('Analysis error:', error);
        showNotification('Error analyzing paper: ' + error.message, 'error');
    }
});

// Display Results
function displayResults(results) {
    // Display Keywords
    const keywordsContainer = document.querySelector('.keywords-container');
    if (results.keywords) {
        keywordsContainer.innerHTML = results.keywords.map(keyword => 
            `<div class="keyword-item">
                <span class="keyword-text">${keyword.text}</span>
                <span class="keyword-score">${(keyword.score * 100).toFixed(1)}%</span>
            </div>`
        ).join('');
    }

    // Display Summary
    const summaryContainer = document.querySelector('.summary-container');
    if (results.summary) {
        summaryContainer.innerHTML = `<div class="summary-text">${results.summary}</div>`;
    }

    // Display Related Works
    const relatedContainer = document.querySelector('.related-works-container');
    if (results.related_works) {
        // Add MathJax script if not already loaded
        if (!window.MathJax) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
            script.async = true;
            document.head.appendChild(script);
            
            window.MathJax = {
                tex: {
                    inlineMath: [['$', '$'], ['\\(', '\\)']],
                    displayMath: [['$$', '$$'], ['\\[', '\\]']]
                }
            };
        }
        
        // Display formulas
        relatedContainer.innerHTML = results.related_works.map((formula, index) => {
            // Determine the formula display based on type
            let formulaDisplay = formula.formula;
            
            // Wrap formula in appropriate delimiters for MathJax
            if (!formulaDisplay.includes('$') && !formulaDisplay.includes('\\[') && !formulaDisplay.includes('\\(')) {
                // If no delimiters, add them
                if (formula.type === 'definition' || formula.type === 'theorem' || formula.importance > 0.7) {
                    formulaDisplay = `\\[${formulaDisplay}\\]`; // Display math for important formulas
                } else {
                    formulaDisplay = `\\(${formulaDisplay}\\)`; // Inline math for others
                }
            }
            
            // Ensure variables is properly formatted for display
            let variablesDisplay = '';
            if (formula.variables) {
                let englishVariables = '';
                let chineseVariables = '';
                
                // Handle English variables
                if (typeof formula.variables === 'string') {
                    try {
                        const variablesObj = JSON.parse(formula.variables);
                        englishVariables = Object.entries(variablesObj)
                            .map(([symbol, description]) => {
                                // Wrap mathematical symbols in LaTeX delimiters
                                const mathSymbol = `\\(${symbol}\\)`;
                                return `<div class="variable-item"><span class="variable-symbol">${mathSymbol}</span><span class="variable-separator">:</span><span class="variable-desc">${description}</span></div>`;
                            })
                            .join('');
                    } catch (e) {
                        englishVariables = `<div class="variable-item">${formula.variables}</div>`;
                    }
                } else if (typeof formula.variables === 'object') {
                    englishVariables = Object.entries(formula.variables)
                        .map(([symbol, description]) => {
                            // Wrap mathematical symbols in LaTeX delimiters
                            const mathSymbol = `\\(${symbol}\\)`;
                            return `<div class="variable-item"><span class="variable-symbol">${mathSymbol}</span><span class="variable-separator">:</span><span class="variable-desc">${description}</span></div>`;
                        })
                        .join('');
                } else {
                    englishVariables = `<div class="variable-item">${String(formula.variables)}</div>`;
                }
                
                // Handle Chinese variables if available
                if (formula.variables_chinese) {
                    if (typeof formula.variables_chinese === 'string') {
                        try {
                            const variablesChineseObj = JSON.parse(formula.variables_chinese);
                            chineseVariables = Object.entries(variablesChineseObj)
                                .map(([symbol, description]) => {
                                    // Wrap mathematical symbols in LaTeX delimiters
                                    const mathSymbol = `\\(${symbol}\\)`;
                                    return `<div class="variable-item"><span class="variable-symbol">${mathSymbol}</span><span class="variable-separator">:</span><span class="variable-desc">${description}</span></div>`;
                                })
                                .join('');
                        } catch (e) {
                            chineseVariables = `<div class="variable-item">${formula.variables_chinese}</div>`;
                        }
                    } else if (typeof formula.variables_chinese === 'object') {
                        chineseVariables = Object.entries(formula.variables_chinese)
                            .map(([symbol, description]) => {
                                // Wrap mathematical symbols in LaTeX delimiters
                                const mathSymbol = `\\(${symbol}\\)`;
                                return `<div class="variable-item"><span class="variable-symbol">${mathSymbol}</span><span class="variable-separator">:</span><span class="variable-desc">${description}</span></div>`;
                            })
                            .join('');
                    }
                }
                
                if (chineseVariables) {
                    variablesDisplay = `
                        <div class="variables-tabs">
                            <button class="var-tab-btn active" onclick="switchVariableTab(this, 'english')">English</button>
                            <button class="var-tab-btn" onclick="switchVariableTab(this, 'chinese')">中文</button>
                        </div>
                        <div class="variables-content">
                            <div class="variables-list english-vars active">${englishVariables}</div>
                            <div class="variables-list chinese-vars">${chineseVariables}</div>
                        </div>`;
                } else {
                    variablesDisplay = `<div class="variables-list">${englishVariables}</div>`;
                }
            }
            
            return `<div class="formula-item">
                <div class="formula-header">
                    <span class="formula-number">#${index + 1}</span>
                    <span class="formula-type ${formula.type}">${formula.type.toUpperCase()}</span>
                </div>
                <div class="formula-expression">${formulaDisplay}</div>
                <div class="formula-description">${formula.description}</div>
                ${variablesDisplay ? `<div class="formula-variables"><strong>Variables:</strong><div class="variables-list">${variablesDisplay}</div></div>` : ''}
                <div class="formula-context"><strong>Context:</strong> ${formula.context}</div>
                <div class="formula-chinese"><strong>中文描述:</strong> ${formula.chinese_description || formula.Chinese_description || 'No Chinese description'}</div>
            </div>`;
        }).join('');
        
        // Trigger MathJax to process the formulas
        if (window.MathJax && window.MathJax.typesetPromise) {
            window.MathJax.typesetPromise([relatedContainer]).catch((e) => console.error(e));
        }
    }
}

// Export Results
exportBtn.addEventListener('click', () => {
    const results = {
        keywords: Array.from(document.querySelectorAll('.keyword-item')).map(item => ({
            text: item.querySelector('.keyword-text').textContent,
            score: parseFloat(item.querySelector('.keyword-score').textContent) / 100
        })),
        summary: document.querySelector('.summary-text')?.textContent,
        related_works: Array.from(document.querySelectorAll('.formula-item')).map(item => {
            const variablesElement = item.querySelector('.formula-variables');
            const contextElement = item.querySelector('.formula-context');
            const chineseElement = item.querySelector('.formula-chinese');
            
            return {
                formula: item.querySelector('.formula-expression').textContent,
                type: item.querySelector('.formula-type').textContent.toLowerCase(),
                description: item.querySelector('.formula-description').textContent,
                variables: variablesElement ? variablesElement.textContent.replace('Variables: ', '') : '',
                context: contextElement ? contextElement.textContent.replace('Context: ', '') : '',
                chinese_description: chineseElement ? chineseElement.textContent.replace('中文描述: ', '') : ''
            };
        })
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'paper_analysis_results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// Utility Functions
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
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

// Function to switch between English and Chinese variable descriptions
function switchVariableTab(button, language) {
    const variablesContainer = button.closest('.formula-variables');
    const tabs = variablesContainer.querySelectorAll('.var-tab-btn');
    const contents = variablesContainer.querySelectorAll('.variables-list');
    
    // Update tab buttons
    tabs.forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    
    // Update content visibility
    contents.forEach(content => content.classList.remove('active'));
    const targetContent = variablesContainer.querySelector(`.${language}-vars`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// Make function global so it can be called from onclick
window.switchVariableTab = switchVariableTab; 