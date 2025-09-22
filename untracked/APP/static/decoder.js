/**
 * Template Decoder Module - Full List Iteration Method
 * 
 * This module handles the decoding of template expressions using the Cartesian product approach.
 * It depends on the global 'templates' variable defined in script.js
 * 
 * Functions:
 * - decodeTemplates(): Main function to decode templates
 * - generateCombinations(): Generate all possible combinations using Cartesian product
 * - displayDecodedResults(): Display the decoded results
 * - searchResults(): Search through all decoded results
 * - copySingleResult(): Copy a single result to clipboard
 * - copyAllResults(): Copy all results to clipboard
 * - downloadResults(): Download results as a text file
 */

// Global variable to store all decoded expressions for searching
let allDecodedExpressions = [];
let displayedExpressions = [];
const MAX_DISPLAY_RESULTS = 999;

// Decode templates with full list approach
function decodeTemplates() {
    const editor = document.getElementById('expressionEditor');
    const expression = editor.value.trim();
    const errorsDiv = document.getElementById('grammarErrors');
    
    // Check if expression is empty
    if (!expression) {
        errorsDiv.innerHTML = '<div class="error-item"><strong>ERROR:</strong> Please enter an expression to decode</div>';
        return;
    }
    
    // First, detect all templates
    const templateRegex = /<(\w+)\/>/g;
    const matches = [...expression.matchAll(templateRegex)];
    const uniqueTemplates = [...new Set(matches.map(match => match[1]))];
    
    // Check if there are any templates to decode
    if (uniqueTemplates.length === 0) {
        errorsDiv.innerHTML = '<div class="error-item"><strong>ERROR:</strong> No templates found in the expression to decode</div>';
        return;
    }
    
    // Check if all templates have been configured
    const unconfigured = [];
    const templateValues = new Map();
    
    uniqueTemplates.forEach(templateName => {
        const template = templates.get(templateName);
        if (!template || !template.variables || template.variables.length === 0) {
            unconfigured.push(templateName);
        } else {
            templateValues.set(templateName, template.variables);
        }
    });
    
    // Show error if any templates are not configured
    if (unconfigured.length > 0) {
        errorsDiv.innerHTML = `<div class="error-item">
            <strong>ERROR:</strong> The following templates need to be configured before decoding: 
            ${unconfigured.map(t => `<span class="template-name" style="font-family: monospace;">&lt;${t}/&gt;</span>`).join(', ')}
        </div>`;
        return;
    }
    
    // Calculate total combinations
    let totalCombinations = 1;
    templateValues.forEach(values => {
        totalCombinations *= values.length;
    });
    
    // Warn if too many combinations
    if (totalCombinations > 1000) {
        if (!confirm(`This will generate ${totalCombinations} expressions. This might take a while. Continue?`)) {
            return;
        }
    }
    
    // Generate all combinations (Cartesian product)
    const combinations = generateCombinations(templateValues);
    
    // Generate decoded expressions
    const decodedExpressions = combinations.map(combination => {
        let decodedExpression = expression;
        combination.forEach(({template, value}) => {
            const regex = new RegExp(`<${template}/>`, 'g');
            decodedExpression = decodedExpression.replace(regex, value);
        });
        return decodedExpression;
    });
    
    // Store all expressions globally
    allDecodedExpressions = decodedExpressions;
    
    // Display results (limit to MAX_DISPLAY_RESULTS)
    displayDecodedResults(decodedExpressions.slice(0, MAX_DISPLAY_RESULTS), decodedExpressions.length);
    
    // Clear errors and show success
    errorsDiv.innerHTML = `<div class="success-message">
        ✓ Successfully decoded ${decodedExpressions.length} expressions using full list approach
        ${decodedExpressions.length > MAX_DISPLAY_RESULTS ? 
            `<br>⚠️ Showing first ${MAX_DISPLAY_RESULTS} results. Use search to find specific expressions.` : ''}
    </div>`;
}

// Generate all combinations (Cartesian product) of template values
function generateCombinations(templateValues) {
    const templates = Array.from(templateValues.keys());
    if (templates.length === 0) return [];
    
    const combinations = [];
    
    function generate(index, current) {
        if (index === templates.length) {
            combinations.push([...current]);
            return;
        }
        
        const template = templates[index];
        const values = templateValues.get(template);
        
        for (const value of values) {
            current.push({template, value});
            generate(index + 1, current);
            current.pop();
        }
    }
    
    generate(0, []);
    return combinations;
}

// Display decoded results
function displayDecodedResults(expressions, totalCount = null, isRandom = false) {
    const resultsList = document.getElementById('resultsList');
    
    // Clear previous results
    resultsList.innerHTML = '';
    
    // Add search box if there are more results than displayed (only for full iteration)
    if (!isRandom && totalCount && totalCount > MAX_DISPLAY_RESULTS) {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'results-search-container';
        searchContainer.innerHTML = `
            <input type="text" id="resultsSearchInput" class="results-search-input" 
                   placeholder="Search through all ${totalCount} expressions...">
            <button id="resultsSearchBtn" class="btn btn-secondary btn-small">Search</button>
            <button id="resultsClearSearchBtn" class="btn btn-outline btn-small" style="display: none;">Clear Search</button>
        `;
        resultsList.appendChild(searchContainer);
        
        // Add event listeners for search
        document.getElementById('resultsSearchBtn').addEventListener('click', searchResults);
        document.getElementById('resultsSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchResults();
        });
        document.getElementById('resultsClearSearchBtn').addEventListener('click', clearSearch);
    }
    
    // Add info about the number of results
    if (expressions.length > 0) {
        const infoDiv = document.createElement('div');
        infoDiv.className = 'results-info';
        if (isRandom) {
            // For random results, show the actual selected count vs total combinations
            const actualSelectedCount = allDecodedExpressions.length;
            if (actualSelectedCount > expressions.length) {
                infoDiv.innerHTML = `Randomly selected <strong>${actualSelectedCount}</strong> expressions from <strong>${totalCount}</strong> total combinations<br>
                                     <small>Displaying first <strong>${expressions.length}</strong> results. Download will include all <strong>${actualSelectedCount}</strong> expressions.</small>`;
            } else {
                infoDiv.innerHTML = `Randomly selected <strong>${expressions.length}</strong> expressions from <strong>${totalCount}</strong> total combinations`;
            }
        } else if (totalCount && totalCount > expressions.length) {
            infoDiv.innerHTML = `Generated <strong>${totalCount}</strong> expressions total. 
                                 Displaying <strong>${expressions.length}</strong> results 
                                 ${expressions.length === MAX_DISPLAY_RESULTS ? '(first 999)' : '(filtered)'}.`;
        } else {
            infoDiv.textContent = `Generated ${expressions.length} expressions using full list iteration`;
        }
        resultsList.appendChild(infoDiv);
    }
    
    // Store displayed expressions globally
    displayedExpressions = expressions;
    
    // Add each expression
    expressions.forEach((expr, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const number = document.createElement('span');
        number.className = 'result-number';
        number.textContent = `${index + 1}.`;
        
        const expression = document.createElement('span');
        expression.className = 'result-expression';
        expression.textContent = expr;
        
        resultItem.appendChild(number);
        resultItem.appendChild(expression);
        // Copy button disabled
        // resultItem.appendChild(copyBtn);
        resultsList.appendChild(resultItem);
    });
    
    // Show the results tab and update badge
    const resultsTab = document.getElementById('resultsTab');
    const resultsBadge = document.getElementById('resultsBadge');
    resultsTab.style.display = 'flex';
    resultsBadge.textContent = totalCount || expressions.length;
    
    // Navigate to results page
    navigateToPage('results');
}

// Search through all results
function searchResults() {
    const searchInput = document.getElementById('resultsSearchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // If empty search, show first 1000 again
        displayDecodedResults(allDecodedExpressions.slice(0, MAX_DISPLAY_RESULTS), allDecodedExpressions.length);
        return;
    }
    
    // Filter all expressions based on search term
    const filteredExpressions = allDecodedExpressions.filter(expr => 
        expr.toLowerCase().includes(searchTerm)
    );
    
    // Display filtered results (still limit to MAX_DISPLAY_RESULTS)
    displayDecodedResults(filteredExpressions.slice(0, MAX_DISPLAY_RESULTS), allDecodedExpressions.length);
    
    // Show clear button
    document.getElementById('resultsClearSearchBtn').style.display = 'inline-block';
    
    // Update info message
    const errorsDiv = document.getElementById('grammarErrors');
    if (filteredExpressions.length === 0) {
        errorsDiv.innerHTML = `<div class="warning-message">
            No expressions found matching "${searchTerm}"
        </div>`;
    } else if (filteredExpressions.length > MAX_DISPLAY_RESULTS) {
        errorsDiv.innerHTML = `<div class="success-message">
            Found ${filteredExpressions.length} expressions matching "${searchTerm}". 
            Showing first ${MAX_DISPLAY_RESULTS} results.
        </div>`;
    } else {
        errorsDiv.innerHTML = `<div class="success-message">
            Found ${filteredExpressions.length} expressions matching "${searchTerm}"
        </div>`;
    }
}

// Clear search and show original results
function clearSearch() {
    document.getElementById('resultsSearchInput').value = '';
    document.getElementById('resultsClearSearchBtn').style.display = 'none';
    displayDecodedResults(allDecodedExpressions.slice(0, MAX_DISPLAY_RESULTS), allDecodedExpressions.length);
    
    const errorsDiv = document.getElementById('grammarErrors');
    errorsDiv.innerHTML = `<div class="success-message">
        ✓ Showing first ${MAX_DISPLAY_RESULTS} of ${allDecodedExpressions.length} total expressions
    </div>`;
}

// Copy single result
function copySingleResult(expression) {
    navigator.clipboard.writeText(expression).then(() => {
        // Show temporary success message
        const errorsDiv = document.getElementById('grammarErrors');
        const prevContent = errorsDiv.innerHTML;
        errorsDiv.innerHTML = '<div class="success-message">✓ Copied to clipboard</div>';
        setTimeout(() => {
            errorsDiv.innerHTML = prevContent;
        }, 2000);
    });
}

// Copy displayed results
function copyDisplayedResults() {
    // Copy all currently displayed expressions
    try {
        const expressions = displayedExpressions.join('\n');
        
        navigator.clipboard.writeText(expressions).then(() => {
            const errorsDiv = document.getElementById('grammarErrors');
            errorsDiv.innerHTML = `<div class="success-message">
                ✓ ${displayedExpressions.length.toLocaleString()} displayed expressions copied to clipboard
            </div>`;
        }).catch(err => {
            const errorsDiv = document.getElementById('grammarErrors');
            errorsDiv.innerHTML = `<div class="error-item">
                <strong>ERROR:</strong> Failed to copy to clipboard: ${err.message}
            </div>`;
        });
    } catch (error) {
        const errorsDiv = document.getElementById('grammarErrors');
        errorsDiv.innerHTML = `<div class="error-item">
            <strong>ERROR:</strong> Failed to prepare data for clipboard: ${error.message}
        </div>`;
    }
}

// Copy all results
function copyAllResults() {
    // Copy ALL generated expressions
    try {
        // Check if the data is too large for clipboard (rough estimate: 1MB limit)
        const expressions = allDecodedExpressions.join('\n');
        const dataSize = new Blob([expressions]).size;
        
        if (dataSize > 1024 * 1024) { // 1MB limit
            const errorsDiv = document.getElementById('grammarErrors');
            errorsDiv.innerHTML = `<div class="error-item">
                <strong>ERROR:</strong> Data too large for clipboard (${(dataSize / 1024 / 1024).toFixed(1)}MB). 
                Please use the Download All button instead.
            </div>`;
            return;
        }
        
        navigator.clipboard.writeText(expressions).then(() => {
            const errorsDiv = document.getElementById('grammarErrors');
            errorsDiv.innerHTML = `<div class="success-message">
                ✓ ALL ${allDecodedExpressions.length.toLocaleString()} expressions copied to clipboard
            </div>`;
        }).catch(err => {
            // Handle potential errors with large clipboard operations
            const errorsDiv = document.getElementById('grammarErrors');
            errorsDiv.innerHTML = `<div class="error-item">
                <strong>ERROR:</strong> Failed to copy to clipboard. The data might be too large. 
                Please use the Download All button instead.
            </div>`;
        });
    } catch (error) {
        const errorsDiv = document.getElementById('grammarErrors');
        errorsDiv.innerHTML = `<div class="error-item">
            <strong>ERROR:</strong> Failed to prepare data for clipboard: ${error.message}
        </div>`;
    }
}

// Download results as text file
function downloadResults() {
    try {
        // Download the expressions (all or random selection)
        const expressions = allDecodedExpressions.join('\n');
        
        const blob = new Blob([expressions], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'decoded_expressions.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        const errorsDiv = document.getElementById('grammarErrors');
        errorsDiv.innerHTML = `<div class="success-message">
            ✓ Downloaded ${allDecodedExpressions.length.toLocaleString()} expressions as decoded_expressions.txt
        </div>`;
    } catch (error) {
        const errorsDiv = document.getElementById('grammarErrors');
        errorsDiv.innerHTML = `<div class="error-message">
            ❌ Error downloading file: ${error.message}
        </div>`;
    }
}

// Random iteration - generate all then randomly pick
function randomIteration() {
    const editor = document.getElementById('expressionEditor');
    const expression = editor.value.trim();
    const errorsDiv = document.getElementById('grammarErrors');
    const randomCountInput = document.getElementById('randomCount');
    const randomCount = parseInt(randomCountInput.value) || 10;
    
    // Check if expression is empty
    if (!expression) {
        errorsDiv.innerHTML = '<div class="error-item"><strong>ERROR:</strong> Please enter an expression to decode</div>';
        return;
    }
    
    // First, detect all templates
    const templateRegex = /<(\w+)\/>/g;
    const matches = [...expression.matchAll(templateRegex)];
    const uniqueTemplates = [...new Set(matches.map(match => match[1]))];
    
    // Check if there are any templates to decode
    if (uniqueTemplates.length === 0) {
        errorsDiv.innerHTML = '<div class="error-item"><strong>ERROR:</strong> No templates found in the expression to decode</div>';
        return;
    }
    
    // Check if all templates have been configured
    const unconfigured = [];
    const templateValues = new Map();
    
    uniqueTemplates.forEach(templateName => {
        const template = templates.get(templateName);
        if (!template || !template.variables || template.variables.length === 0) {
            unconfigured.push(templateName);
        } else {
            templateValues.set(templateName, template.variables);
        }
    });
    
    // Show error if any templates are not configured
    if (unconfigured.length > 0) {
        errorsDiv.innerHTML = `<div class="error-item">
            <strong>ERROR:</strong> The following templates need to be configured before decoding: 
            ${unconfigured.map(t => `<span class="template-name" style="font-family: monospace;">&lt;${t}/&gt;</span>`).join(', ')}
        </div>`;
        return;
    }
    
    // Calculate total combinations
    let totalCombinations = 1;
    templateValues.forEach(values => {
        totalCombinations *= values.length;
    });
    
    // Validate random count
    if (randomCount > totalCombinations) {
        errorsDiv.innerHTML = `<div class="warning-message">
            ⚠️ Requested ${randomCount} random expressions, but only ${totalCombinations} unique combinations exist. 
            Generating all ${totalCombinations} expressions instead.
        </div>`;
    }
    
    // Generate all combinations (Cartesian product)
    const combinations = generateCombinations(templateValues);
    
    // Generate all decoded expressions
    const allExpressions = combinations.map(combination => {
        let decodedExpression = expression;
        combination.forEach(({template, value}) => {
            const regex = new RegExp(`<${template}/>`, 'g');
            decodedExpression = decodedExpression.replace(regex, value);
        });
        return decodedExpression;
    });
    
    // Randomly select the requested number of expressions
    const selectedExpressions = [];
    const actualCount = Math.min(randomCount, allExpressions.length);
    
    if (actualCount === allExpressions.length) {
        // If requesting all or more, just return all
        selectedExpressions.push(...allExpressions);
    } else {
        // Randomly select without replacement
        const indices = new Set();
        while (indices.size < actualCount) {
            indices.add(Math.floor(Math.random() * allExpressions.length));
        }
        indices.forEach(index => {
            selectedExpressions.push(allExpressions[index]);
        });
    }
    
    // Store ALL selected expressions globally for download (not limited by display)
    allDecodedExpressions = selectedExpressions;
    
    // For display, limit to MAX_DISPLAY_RESULTS but keep full set for download
    const displayExpressions = selectedExpressions.slice(0, MAX_DISPLAY_RESULTS);
    
    // Display results (limited for display, but full count for download)
    displayDecodedResults(displayExpressions, allExpressions.length, true);
    
    // Clear errors and show success with clear indication about display vs download
    if (selectedExpressions.length > MAX_DISPLAY_RESULTS) {
        errorsDiv.innerHTML = `<div class="success-message">
            ✓ Randomly selected ${selectedExpressions.length} expressions from ${allExpressions.length} total combinations<br>
            📺 Displaying first ${MAX_DISPLAY_RESULTS} results. Download will include all ${selectedExpressions.length} expressions.
        </div>`;
    } else {
        errorsDiv.innerHTML = `<div class="success-message">
            ✓ Randomly selected ${selectedExpressions.length} expressions from ${allExpressions.length} total combinations
        </div>`;
    }
}

// Open settings modal for Next Move
function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'block';
    updateTotalCombinations();
    
    // Add event listeners for setting inputs
    document.querySelectorAll('.setting-value-input').forEach(input => {
        input.addEventListener('input', updateTotalCombinations);
    });
    
    // Add event listener for add setting button
    document.getElementById('addSettingBtn').addEventListener('click', addCustomSetting);
    
    // Add event listener for test period slider
    const testPeriodSlider = document.querySelector('.test-period-slider');
    if (testPeriodSlider) {
        testPeriodSlider.addEventListener('input', updateTestPeriodValue);
        // Initialize the display value
        updateTestPeriodValue();
    }
}

// Close settings modal
function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'none';
}

// Update test period value display
function updateTestPeriodValue() {
    const slider = document.querySelector('.test-period-slider');
    const valueDisplay = document.getElementById('testPeriodValue');
    
    if (slider && valueDisplay) {
        const totalMonths = parseInt(slider.value);
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        const periodValue = `P${years}Y${months}M`;
        valueDisplay.textContent = periodValue;
        
        // Update the slider's value attribute so it can be read by parseSettingValues
        slider.setAttribute('data-period-value', periodValue);
    }
}

// Add custom setting row
function addCustomSetting() {
    const tbody = document.getElementById('settingsTableBody');
    const row = document.createElement('tr');
    row.className = 'custom-setting-row';
    
    row.innerHTML = `
        <td><input type="text" class="setting-name-input form-input" placeholder="Setting name"></td>
        <td><input type="text" class="setting-value-input" data-setting="custom" placeholder="Value(s)"></td>
        <td><select class="setting-type-select"><option>string</option><option>number</option><option>boolean</option></select></td>
        <td><button class="remove-setting-btn" onclick="removeCustomSetting(this)">Remove</button></td>
    `;
    
    tbody.appendChild(row);
    
    // Add event listener to new input
    row.querySelector('.setting-value-input').addEventListener('input', updateTotalCombinations);
    row.querySelector('.setting-name-input').addEventListener('input', updateTotalCombinations);
}

// Remove custom setting row
function removeCustomSetting(button) {
    button.closest('tr').remove();
    updateTotalCombinations();
}

// Calculate total combinations
function updateTotalCombinations() {
    let totalCombinations = allDecodedExpressions.length;
    
    // Get all settings and their values
    const settingInputs = document.querySelectorAll('.setting-value-input');
    settingInputs.forEach(input => {
        const values = input.value.split(',').map(v => v.trim()).filter(v => v !== '');
        if (values.length > 1) {
            totalCombinations *= values.length;
        }
    });
    
    document.getElementById('totalCombinations').textContent = totalCombinations.toLocaleString();
}

// Parse settings values (handle comma-separated values)
function parseSettingValues() {
    const settings = {};
    const variations = {};
    const types = {};
    
    // Get predefined settings
    const settingRows = document.querySelectorAll('#settingsTableBody tr');
    settingRows.forEach(row => {
        const nameCell = row.cells[0];
        // Use select or input for value
        let input = row.querySelector('.setting-value-input');
        if (input) {
            let settingName;
            // Check if it's a custom setting
            const nameInput = row.querySelector('.setting-name-input');
            if (nameInput) {
                settingName = nameInput.value.trim();
                if (!settingName) return; // Skip if no name
            } else {
                settingName = nameCell.textContent.trim();
            }
            // Get the type
            const typeSelect = row.querySelector('.setting-type-select');
            const type = typeSelect ? typeSelect.value : 'string';
            types[settingName] = type;
            // For select dropdowns, get value differently
            let values = [];
            if (input.tagName === 'SELECT') {
                values = [input.value];
            } else if (input.type === 'range' && settingName === 'testPeriod') {
                // Special handling for test period slider
                const periodValue = input.getAttribute('data-period-value') || 'P0Y0M';
                values = [periodValue];
            } else {
                values = input.value.split(',').map(v => v.trim()).filter(v => v !== '');
            }
            // Convert values based on type
            const convertedValues = values.map(v => {
                if (type === 'number') {
                    const num = parseFloat(v);
                    return isNaN(num) ? v : num;
                } else if (type === 'boolean') {
                    if (typeof v === 'boolean') return v;
                    if (typeof v === 'string') {
                        if (v.toLowerCase() === 'true') return true;
                        if (v.toLowerCase() === 'false') return false;
                    }
                    return false;
                } else {
                    return v;
                }
            });
            if (convertedValues.length === 0) {
                // Use empty string if no value
                settings[settingName] = '';
            } else if (convertedValues.length === 1) {
                // Single value
                settings[settingName] = convertedValues[0];
            } else {
                // Multiple values - store for iteration
                variations[settingName] = convertedValues;
                settings[settingName] = convertedValues[0]; // Default to first value
            }
        }
    });
    
    return { settings, variations, types };
}

// Generate all setting combinations
function generateSettingCombinations(baseSettings, variations) {
    const variationKeys = Object.keys(variations);
    if (variationKeys.length === 0) {
        return [baseSettings];
    }
    
    const combinations = [];
    
    function generate(index, current) {
        if (index === variationKeys.length) {
            combinations.push({...current});
            return;
        }
        
        const key = variationKeys[index];
        const values = variations[key];
        
        for (const value of values) {
            current[key] = value;
            generate(index + 1, current);
        }
    }
    
    generate(0, {...baseSettings});
    return combinations;
}

// Confirm and apply settings with shuffle option
function confirmAndApplySettings() {
    const { settings, variations, types } = parseSettingValues();
    const settingCombinations = generateSettingCombinations(settings, variations);
    const totalCombinations = allDecodedExpressions.length * settingCombinations.length;
    
    if (totalCombinations > 1000) {
        // Show confirmation dialog for large datasets
        const shouldShuffle = confirm(`即将生成 ${totalCombinations.toLocaleString()} 个表达式配置。\n\n是否需要随机打乱表达式顺序？\n\n点击"确定"进行随机打乱\n点击"取消"保持原始顺序`);
        applySettings(shouldShuffle);
    } else {
        // For small datasets, ask if user wants to shuffle
        const shouldShuffle = confirm(`即将生成 ${totalCombinations.toLocaleString()} 个表达式配置。\n\n是否需要随机打乱表达式顺序？\n\n点击"确定"进行随机打乱\n点击"取消"保持原始顺序`);
        applySettings(shouldShuffle);
    }
}

// Apply settings to expressions
async function applySettings(shouldShuffle = false) {
    const { settings, variations, types } = parseSettingValues();
    
    // Always include instrumentType and language
    settings.instrumentType = settings.instrumentType || "EQUITY";
    settings.language = settings.language || "FASTEXPR";
    
    // Generate all setting combinations
    const settingCombinations = generateSettingCombinations(settings, variations);
    
    // Calculate total combinations for progress tracking
    const totalCombinations = allDecodedExpressions.length * settingCombinations.length;
    
    // Get the button and show progress
    const button = document.getElementById('generateDownloadBtn');
    const btnText = button.querySelector('.btn-text');
    const btnProgress = button.querySelector('.btn-progress');
    const progressBarFill = button.querySelector('.progress-bar-fill');
    const progressText = button.querySelector('.progress-text');
    
    // Disable button and show progress
    button.disabled = true;
    btnText.style.display = 'none';
    btnProgress.style.display = 'flex';
    
    // Show progress to user
    const errorsDiv = document.getElementById('grammarErrors');
    errorsDiv.innerHTML = `<div class="info-message">
        ⏳ Generating ${totalCombinations.toLocaleString()} expression configurations...
    </div>`;
    
    // Use streaming approach to handle large files
    try {
        // Create a writable stream for the file
        const chunks = [];
        let isFirst = true;
        
        // Start JSON array
        chunks.push('[\n');
        
        let combinationCount = 0;
        
        // Create all combinations first
        const allCombinations = [];
        for (let exprIndex = 0; exprIndex < allDecodedExpressions.length; exprIndex++) {
            const expr = allDecodedExpressions[exprIndex];
            
            for (let settingIndex = 0; settingIndex < settingCombinations.length; settingIndex++) {
                const settingCombo = settingCombinations[settingIndex];
                
                const fullExpression = {
                    type: "REGULAR",
                    settings: settingCombo,
                    regular: expr.replace(/\n/g, '')  // Remove newline characters
                };
                
                allCombinations.push(fullExpression);
            }
        }
        
        // Shuffle if requested
        if (shouldShuffle) {
            // Fisher-Yates shuffle algorithm
            for (let i = allCombinations.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allCombinations[i], allCombinations[j]] = [allCombinations[j], allCombinations[i]];
            }
        }
        
        // Process combinations in order (original or shuffled)
        for (let i = 0; i < allCombinations.length; i++) {
            const fullExpression = allCombinations[i];
            
            // Add comma separator if not the first item
            if (!isFirst) {
                chunks.push(',\n');
            } else {
                isFirst = false;
            }
            
            // Add the JSON stringified expression
            chunks.push(JSON.stringify(fullExpression, null, 2));
            
            combinationCount++;
                
                // Update progress every 1000 combinations
                if (combinationCount % 1000 === 0) {
                    const progress = Math.round((combinationCount / totalCombinations) * 100);
                    errorsDiv.innerHTML = `<div class="info-message">
                        ⏳ Generating ${totalCombinations.toLocaleString()} expression configurations... ${progress}%
                    </div>`;
                    
                    // Update button progress
                    progressBarFill.style.width = `${progress}%`;
                    progressText.textContent = `Generating... ${progress}%`;
                    
                    // Allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        
        // End JSON array
        chunks.push('\n]');
        
        // Create blob from chunks
        const blob = new Blob(chunks, { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expressions_with_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Close modal and show success
        closeSettingsModal();
        errorsDiv.innerHTML = `<div class="success-message">
            ✓ Downloaded ${combinationCount.toLocaleString()} expression configurations as expressions_with_settings.json
        </div>`;
        
    } catch (error) {
        console.error('Error generating file:', error);
        errorsDiv.innerHTML = `<div class="error-message">
            ❌ Error generating file: ${error.message}
        </div>`;
    } finally {
        // Restore button state
        if (button) {
            button.disabled = false;
            btnText.style.display = 'inline';
            btnProgress.style.display = 'none';
            progressBarFill.style.width = '0%';
        }
    }
}

// Store test results globally
let allTestResults = [];

// Generate and test expressions with BRAIN API
async function generateAndTest() {
    const { settings, variations, types } = parseSettingValues();
    
    // Check if user is logged in to BRAIN using the proper method
    if (!window.brainAPI || !window.brainAPI.isConnectedToBrain()) {
        alert('Please connect to BRAIN first before testing expressions.');
        return;
    }
    
    // Get the session ID from the global variable
    const sessionId = brainSessionId;
    if (!sessionId) {
        alert('BRAIN session not found. Please reconnect to BRAIN.');
        return;
    }
    
    // Always include instrumentType and language
    settings.instrumentType = settings.instrumentType || "EQUITY";
    settings.language = settings.language || "FASTEXPR";
    
    // Generate all setting combinations
    const settingCombinations = generateSettingCombinations(settings, variations);
    
    // Create all expression-setting combinations
    const allCombinations = [];
    
    allDecodedExpressions.forEach(expr => {
        settingCombinations.forEach(settingCombo => {
            const fullExpression = {
                type: "REGULAR",
                settings: settingCombo,
                regular: expr.replace(/\n/g, '')  // Remove newline characters
            };
            allCombinations.push(fullExpression);
        });
    });
    
    // Randomly pick one expression to test
    const randomIndex = Math.floor(Math.random() * allCombinations.length);
    const testExpression = allCombinations[randomIndex];
    
    // Close settings modal and open test results modal
    closeSettingsModal();
    openBrainTestResultsModal();
    
    // Show progress
    const progressDiv = document.getElementById('brainTestProgress');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressText = document.getElementById('progressText');
    const resultsDiv = document.getElementById('brainTestResults');
    
    progressDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    allTestResults = [];
    
    // Test the single randomly selected expression
    progressText.textContent = `Testing expression ${randomIndex + 1} of ${allCombinations.length} (randomly selected)...`;
    progressBarFill.style.width = '50%';
    
    try {
        const response = await fetch('/api/test-expression', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Session-ID': sessionId
            },
            body: JSON.stringify(testExpression)
        });
        
        const result = await response.json();
        
        // Store result
        const testResult = {
            expression: testExpression.regular,
            settings: testExpression.settings,
            success: result.success,
            status: result.status || (result.success ? 'SUCCESS' : 'ERROR'),
            message: result.message || result.error || 'Unknown error',
            details: result,
            totalPossible: allCombinations.length,
            testedIndex: randomIndex + 1
        };
        
        allTestResults.push(testResult);
        
        // Update progress
        progressBarFill.style.width = '100%';
        progressText.textContent = 'Test completed!';
        
        // Hide progress after a short delay
        setTimeout(() => {
            progressDiv.style.display = 'none';
            
            // Display the result
            displaySingleTestResult(testResult);
            
            // Show download buttons
            document.getElementById('downloadTestResultsBtn').style.display = 'inline-block';
            document.getElementById('downloadExpressionWithSettingsBtn').style.display = 'inline-block';
        }, 500);
        
    } catch (error) {
        const testResult = {
            expression: testExpression.regular,
            settings: testExpression.settings,
            success: false,
            status: 'ERROR',
            message: `Network error: ${error.message}`,
            details: { error: error.message },
            totalPossible: allCombinations.length,
            testedIndex: randomIndex + 1
        };
        allTestResults.push(testResult);
        
        progressDiv.style.display = 'none';
        displaySingleTestResult(testResult);
        document.getElementById('downloadTestResultsBtn').style.display = 'inline-block';
        document.getElementById('downloadExpressionWithSettingsBtn').style.display = 'inline-block';
    }
}

// Display single test result
function displaySingleTestResult(result) {
    const resultsDiv = document.getElementById('brainTestResults');
    
    // Add summary info
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'test-summary';
    summaryDiv.innerHTML = `
        <h4>Random Test Result</h4>
        <p>Randomly selected expression #${result.testedIndex} out of ${result.totalPossible} possible combinations</p>
    `;
    resultsDiv.appendChild(summaryDiv);
    
    // Add the test result
    const resultItem = document.createElement('div');
    resultItem.className = `test-result-item ${result.success && result.status !== 'ERROR' ? 'success' : 'error'}`;
    
    const expressionDiv = document.createElement('div');
    expressionDiv.className = 'test-result-expression';
    expressionDiv.innerHTML = `<strong>Expression:</strong> ${result.expression}`;
    
    // Display the message as it appears in the notebook
    const messageDiv = document.createElement('div');
    messageDiv.className = 'test-result-message';
    messageDiv.style.whiteSpace = 'pre-wrap';
    messageDiv.style.fontFamily = 'monospace';
    messageDiv.style.backgroundColor = '#f5f5f5';
    messageDiv.style.padding = '10px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.marginTop = '10px';
    
    // Format the message - if it's the full response object, show it nicely
    if (result.details && result.details.full_response) {
        const fullResponse = result.details.full_response;
        
        // If it's an object with the expected structure, format it nicely
        if (typeof fullResponse === 'object' && fullResponse.id && fullResponse.type && fullResponse.status) {
            // Format like Python dict output
            messageDiv.textContent = JSON.stringify(fullResponse, null, 2).replace(/"/g, "'");
        } else if (typeof fullResponse === 'object') {
            // For other objects, just stringify them
            messageDiv.textContent = JSON.stringify(fullResponse, null, 2);
        } else {
            // For non-objects, show the message string
            messageDiv.textContent = result.message;
        }
    } else {
        // Fallback to simple message
        messageDiv.textContent = result.message;
    }
    
    resultItem.appendChild(expressionDiv);
    resultItem.appendChild(messageDiv);
    
    // Add settings info
    const settingsDiv = document.createElement('div');
    settingsDiv.className = 'test-result-message';
    settingsDiv.innerHTML = '<strong>Settings used:</strong>';
    const settingsList = document.createElement('ul');
    settingsList.style.margin = '5px 0';
    settingsList.style.paddingLeft = '20px';
    
    for (const [key, value] of Object.entries(result.settings)) {
        const li = document.createElement('li');
        li.textContent = `${key}: ${value}`;
        settingsList.appendChild(li);
    }
    
    settingsDiv.appendChild(settingsList);
    resultItem.appendChild(settingsDiv);
    
    resultsDiv.appendChild(resultItem);
}

// Compatibility wrapper for old function name
function addTestResultToDisplay(result, index) {
    // Add index info to result if not present
    if (!result.testedIndex) {
        result.testedIndex = index;
    }
    if (!result.totalPossible) {
        result.totalPossible = allDecodedExpressions.length;
    }
    displaySingleTestResult(result);
}

// Show test summary (kept for compatibility)
function showTestSummary(total, success, error) {
    const resultsDiv = document.getElementById('brainTestResults');
    
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'test-summary';
    summaryDiv.innerHTML = `
        <h4>Test Summary</h4>
        <div class="test-summary-stats">
            <div class="test-summary-stat">
                <div class="test-summary-stat-value">${total}</div>
                <div class="test-summary-stat-label">Total Tests</div>
            </div>
            <div class="test-summary-stat" style="color: #28a745;">
                <div class="test-summary-stat-value">${success}</div>
                <div class="test-summary-stat-label">Successful</div>
            </div>
            <div class="test-summary-stat" style="color: #dc3545;">
                <div class="test-summary-stat-value">${error}</div>
                <div class="test-summary-stat-label">Errors</div>
            </div>
            <div class="test-summary-stat">
                <div class="test-summary-stat-value">${((success / total) * 100).toFixed(1)}%</div>
                <div class="test-summary-stat-label">Success Rate</div>
            </div>
        </div>
    `;
    
    resultsDiv.insertBefore(summaryDiv, resultsDiv.firstChild);
}

// Open test results modal
function openBrainTestResultsModal() {
    const modal = document.getElementById('brainTestResultsModal');
    modal.style.display = 'block';
    
    // Hide buttons initially - they will be shown when test is completed
    document.getElementById('downloadTestResultsBtn').style.display = 'none';
    document.getElementById('downloadExpressionWithSettingsBtn').style.display = 'none';
}

// Close test results modal
function closeBrainTestResultsModal() {
    const modal = document.getElementById('brainTestResultsModal');
    modal.style.display = 'none';
    
    // Hide buttons when modal is closed
    document.getElementById('downloadTestResultsBtn').style.display = 'none';
    document.getElementById('downloadExpressionWithSettingsBtn').style.display = 'none';
}

// Download test results
function goToSimulator() {
    // Navigate to the simulator page
    window.location.href = '/simulator';
}

function downloadTestResults() {
    const results = allTestResults.map(result => ({
        expression: result.expression,
        settings: result.settings,
        status: result.status,
        message: result.message,
        details: result.details
    }));
    
    const jsonContent = JSON.stringify(results, null, 2);
    
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brain_test_results.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    const errorsDiv = document.getElementById('grammarErrors');
    errorsDiv.innerHTML = `<div class="success-message">
        ✓ Downloaded test results for ${allTestResults.length} expressions
    </div>`;
}

// Confirm and download expression with settings with shuffle option
function confirmAndDownloadExpressionWithSettings() {
    const { settings, variations, types } = parseSettingValues();
    const settingCombinations = generateSettingCombinations(settings, variations);
    const totalCombinations = allDecodedExpressions.length * settingCombinations.length;
    
    if (totalCombinations > 1000) {
        // Show confirmation dialog for large datasets
        const shouldShuffle = confirm(`即将生成 ${totalCombinations.toLocaleString()} 个表达式配置。\n\n是否需要随机打乱表达式顺序？\n\n点击"确定"进行随机打乱\n点击"取消"保持原始顺序`);
        downloadExpressionWithSettings(shouldShuffle);
    } else {
        // For small datasets, ask if user wants to shuffle
        const shouldShuffle = confirm(`即将生成 ${totalCombinations.toLocaleString()} 个表达式配置。\n\n是否需要随机打乱表达式顺序？\n\n点击"确定"进行随机打乱\n点击"取消"保持原始顺序`);
        downloadExpressionWithSettings(shouldShuffle);
    }
}

// Download expression with settings (same as Generate & Download)
async function downloadExpressionWithSettings(shouldShuffle = false) {
    // Get current settings from the modal (same logic as applySettings)
    const { settings, variations, types } = parseSettingValues();
    
    // Always include instrumentType and language
    settings.instrumentType = settings.instrumentType || "EQUITY";
    settings.language = settings.language || "FASTEXPR";
    
    // Generate all setting combinations
    const settingCombinations = generateSettingCombinations(settings, variations);
    
    // Calculate total combinations for progress tracking
    const totalCombinations = allDecodedExpressions.length * settingCombinations.length;
    
    // Get the button and show progress
    const button = document.getElementById('downloadExpressionWithSettingsBtn');
    const btnText = button.querySelector('.btn-text');
    const btnProgress = button.querySelector('.btn-progress');
    const progressBarFill = button.querySelector('.progress-bar-fill');
    const progressText = button.querySelector('.progress-text');
    
    // Disable button and show progress
    button.disabled = true;
    btnText.style.display = 'none';
    btnProgress.style.display = 'flex';
    
    // Show progress to user
    const errorsDiv = document.getElementById('grammarErrors');
    errorsDiv.innerHTML = `<div class="info-message">
        ⏳ Generating ${totalCombinations.toLocaleString()} expression configurations...
    </div>`;
    
    // Use streaming approach to handle large files
    try {
        // Create a writable stream for the file
        const chunks = [];
        let isFirst = true;
        
        // Start JSON array
        chunks.push('[\n');
        
        let combinationCount = 0;
        
        // Create all combinations first
        const allCombinations = [];
        for (let exprIndex = 0; exprIndex < allDecodedExpressions.length; exprIndex++) {
            const expr = allDecodedExpressions[exprIndex];
            
            for (let settingIndex = 0; settingIndex < settingCombinations.length; settingIndex++) {
                const settingCombo = settingCombinations[settingIndex];
                
                const fullExpression = {
                    type: "REGULAR",
                    settings: settingCombo,
                    regular: expr.replace(/\n/g, '')  // Remove newline characters
                };
                
                allCombinations.push(fullExpression);
            }
        }
        
        // Shuffle if requested
        if (shouldShuffle) {
            // Fisher-Yates shuffle algorithm
            for (let i = allCombinations.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allCombinations[i], allCombinations[j]] = [allCombinations[j], allCombinations[i]];
            }
        }
        
        // Process combinations in order (original or shuffled)
        for (let i = 0; i < allCombinations.length; i++) {
            const fullExpression = allCombinations[i];
            
            // Add comma separator if not the first item
            if (!isFirst) {
                chunks.push(',\n');
            } else {
                isFirst = false;
            }
            
            // Add the JSON stringified expression
            chunks.push(JSON.stringify(fullExpression, null, 2));
            
            combinationCount++;
                
                // Update progress every 1000 combinations
                if (combinationCount % 1000 === 0) {
                    const progress = Math.round((combinationCount / totalCombinations) * 100);
                    errorsDiv.innerHTML = `<div class="info-message">
                        ⏳ Generating ${totalCombinations.toLocaleString()} expression configurations... ${progress}%
                    </div>`;
                    
                    // Update button progress
                    progressBarFill.style.width = `${progress}%`;
                    progressText.textContent = `Generating... ${progress}%`;
                    
                    // Allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        
        // End JSON array
        chunks.push('\n]');
        
        // Create blob from chunks
        const blob = new Blob(chunks, { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'expressions_with_settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        errorsDiv.innerHTML = `<div class="success-message">
            ✓ Downloaded ${combinationCount.toLocaleString()} expression configurations as expressions_with_settings.json
        </div>`;
        
    } catch (error) {
        console.error('Error generating file:', error);
        errorsDiv.innerHTML = `<div class="error-message">
            ❌ Error generating file: ${error.message}
        </div>`;
    } finally {
        // Restore button state
        if (button) {
            button.disabled = false;
            btnText.style.display = 'inline';
            btnProgress.style.display = 'none';
            progressBarFill.style.width = '0%';
        }
    }
} 