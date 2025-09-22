// Idea House JavaScript - Handles data field selection and Coze API processing

// Global variables
let dataFields = [];
let filteredDataFields = [];
let selectedFields = new Map(); // Map of field_id -> description

// Filter state variables
let columnFilters = {
    id: '',
    description: '',
    type: '',
    coverage: { min: null, max: null },
    userCount: null,
    alphaCount: null
};
let sortColumn = null;
let sortOrder = 'asc';

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    document.getElementById('loadDataFieldsBtn').addEventListener('click', loadDataFields);
    document.getElementById('clearSelectionBtn').addEventListener('click', clearSelection);
    document.getElementById('processFieldsBtn').addEventListener('click', processSelectedFields);
    
    // Set up API token toggle button
    const toggleBtn = document.getElementById('toggleApiTokenBtn');
    const tokenInput = document.getElementById('cozeApiTokenInput');
    
    toggleBtn.addEventListener('click', function() {
        if (tokenInput.type === 'password') {
            tokenInput.type = 'text';
            toggleBtn.textContent = 'Hide';
        } else {
            tokenInput.type = 'password';
            toggleBtn.textContent = 'Show';
        }
    });
    
    // Load saved configuration
    loadSavedCozeConfig();
    
    // Set up save configuration button
    document.getElementById('saveCozeConfigBtn').addEventListener('click', saveCozeConfig);
    
    // Set up clear configuration button
    document.getElementById('clearCozeConfigBtn').addEventListener('click', clearCozeConfig);
    
    // Set up filter event listeners
    setupFilterEventListeners();
});

// Load data fields from BRAIN API
async function loadDataFields() {
    const region = document.getElementById('regionInput').value;
    const delay = document.getElementById('delayInput').value;
    const universe = document.getElementById('universeInput').value;
    const datasetId = document.getElementById('datasetInput').value;
    
    // Show loading state
    document.getElementById('dataFieldsStats').textContent = 'Loading data fields...';
    document.getElementById('tableContainer').style.display = 'none';
    
    try {
        // Get session ID from localStorage or cookie
        const sessionId = localStorage.getItem('brain_session_id');
        
        if (!sessionId) {
            alert('Please connect to BRAIN first from the main page');
            return;
        }
        
        // Call the proxy endpoint
        const params = new URLSearchParams({
            region: region,
            delay: delay,
            universe: universe,
            dataset_id: datasetId
        });
        
        // Log the API calls
        console.log('🚀 Making API calls to fetch data fields and dataset description');
        console.log('📋 Parameters:', {
            region: region,
            delay: delay,
            universe: universe,
            dataset_id: datasetId
        });
        
        // Fetch data fields and dataset description in parallel
        const [dataFieldsResponse, descriptionResponse] = await Promise.all([
            fetch(`/idea-house/api/get-datafields-proxy?${params}`, {
                method: 'GET',
                headers: {
                    'Session-ID': sessionId
                }
            }),
            fetch(`/idea-house/api/get-dataset-description?${params}`, {
                method: 'GET',
                headers: {
                    'Session-ID': sessionId
                }
            })
        ]);
        
        console.log('📥 Received responses:');
        console.log('   Data fields status:', dataFieldsResponse.status);
        console.log('   Dataset description status:', descriptionResponse.status);
        
        if (!dataFieldsResponse.ok) {
            const errorData = await dataFieldsResponse.json();
            throw new Error(errorData.error || 'Failed to fetch data fields');
        }
        
        dataFields = await dataFieldsResponse.json();
        
        // Get dataset description if available
        let datasetDescription = '';
        if (descriptionResponse.ok) {
            console.log('✅ Dataset description response OK, parsing JSON...');
            const descriptionData = await descriptionResponse.json();
            console.log('📄 Description data:', descriptionData);
            
            if (descriptionData.success) {
                datasetDescription = descriptionData.description;
                // Store it globally for later use
                window.currentDatasetDescription = datasetDescription;
                console.log('✅ Dataset description stored:', datasetDescription);
            } else {
                console.log('⚠️ Description response success=false');
            }
        } else {
            console.log('❌ Dataset description response not OK:', descriptionResponse.status);
            try {
                const errorData = await descriptionResponse.json();
                console.log('❌ Error details:', errorData);
            } catch (e) {
                console.log('❌ Could not parse error response');
            }
        }
        
        // Update stats
        document.getElementById('dataFieldsStats').textContent = `Loaded ${dataFields.length} data fields`;
        
        // Populate table with dataset description
        populateDataFieldsTable(datasetDescription);
        
        // Show table
        document.getElementById('tableContainer').style.display = 'block';
        
    } catch (error) {
        console.error('Failed to load data fields:', error);
        document.getElementById('dataFieldsStats').textContent = `Error: ${error.message}`;
        alert(`Failed to load data fields: ${error.message}`);
    }
}

// Populate the data fields table with filtering and sorting
function populateDataFieldsTable(datasetDescription) {
    console.log('📊 populateDataFieldsTable called with description:', datasetDescription);
    
    const tableBody = document.getElementById('dataFieldsTableBody');
    const highCoverageFilter = document.getElementById('filterHighCoverage')?.checked || false;
    const popularFilter = document.getElementById('filterPopular')?.checked || false;
    const matrixOnlyFilter = document.getElementById('filterMatrixOnly')?.checked || false;
    
    // Display dataset description if available
    if (datasetDescription) {
        console.log('🎯 Displaying passed dataset description');
        displayDatasetDescription(datasetDescription);
    } else if (window.currentDatasetDescription) {
        console.log('🎯 Displaying stored dataset description');
        displayDatasetDescription(window.currentDatasetDescription);
    } else {
        console.log('⚠️ No dataset description available');
    }
    
    // Apply filters
    filteredDataFields = dataFields.filter(field => {
        // Column-specific filters
        // ID filter
        if (columnFilters.id && !field.id.toLowerCase().includes(columnFilters.id.toLowerCase())) {
            return false;
        }
        
        // Description filter
        if (columnFilters.description && !field.description.toLowerCase().includes(columnFilters.description.toLowerCase())) {
            return false;
        }
        
        // Type filter
        if (columnFilters.type && field.type !== columnFilters.type) {
            return false;
        }
        
        // Coverage range filter
        if (columnFilters.coverage.min !== null && field.coverage * 100 < columnFilters.coverage.min) {
            return false;
        }
        if (columnFilters.coverage.max !== null && field.coverage * 100 > columnFilters.coverage.max) {
            return false;
        }
        
        // User count filter
        if (columnFilters.userCount !== null && field.userCount < columnFilters.userCount) {
            return false;
        }
        
        // Alpha count filter
        if (columnFilters.alphaCount !== null && field.alphaCount < columnFilters.alphaCount) {
            return false;
        }
        
        // High coverage filter
        if (highCoverageFilter && field.coverage < 0.9) {
            return false;
        }
        
        // Popular filter
        if (popularFilter && field.userCount < 1000) {
            return false;
        }
        
        // Matrix type filter
        if (matrixOnlyFilter && field.type !== 'MATRIX') {
            return false;
        }
        
        return true;
    });
    
    // Sort filtered data fields
    if (sortColumn) {
        filteredDataFields.sort((a, b) => {
            let aVal = a[sortColumn];
            let bVal = b[sortColumn];
            
            // Handle numeric values
            if (sortColumn === 'coverage' || sortColumn === 'userCount' || sortColumn === 'alphaCount') {
                aVal = Number(aVal);
                bVal = Number(bVal);
            } else {
                // String comparison
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // Clear table
    tableBody.innerHTML = '';
    
    if (filteredDataFields.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666; padding: 40px;">No data fields found matching the filters</td></tr>';
        updateDataFieldsStats();
        return;
    }
    
    // Create table rows
    filteredDataFields.forEach(field => {
        const row = document.createElement('tr');
        row.dataset.fieldId = field.id;
        row.dataset.fieldDescription = field.description;
        
        if (selectedFields.has(field.id)) {
            row.classList.add('selected');
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="field-checkbox" data-field-id="${field.id}" data-field-description="${field.description}" ${selectedFields.has(field.id) ? 'checked' : ''}>
            </td>
            <td><span class="data-field-id">${field.id}</span></td>
            <td><span class="data-field-description">${field.description}</span></td>
            <td><span class="data-field-type">${field.type || 'N/A'}</span></td>
            <td><span class="data-field-coverage">${field.coverage ? (field.coverage * 100).toFixed(1) + '%' : 'N/A'}</span></td>
            <td><span class="data-field-count">${field.userCount ? field.userCount.toLocaleString() : 'N/A'}</span></td>
            <td><span class="data-field-count">${field.alphaCount ? field.alphaCount.toLocaleString() : 'N/A'}</span></td>
        `;
        
        // Add click handler for row
        row.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                const checkbox = row.querySelector('.field-checkbox');
                checkbox.checked = !checkbox.checked;
                handleFieldSelection(checkbox);
            }
        });
        
        // Add change handler for checkbox
        const checkbox = row.querySelector('.field-checkbox');
        checkbox.addEventListener('change', function() {
            handleFieldSelection(this);
        });
        
        tableBody.appendChild(row);
    });
    
    // Update stats and populate type filter
    updateDataFieldsStats();
    populateTypeFilter();
    updateSelectAllCheckbox();
}

// Handle field selection
function handleFieldSelection(checkbox) {
    const fieldId = checkbox.dataset.fieldId;
    const fieldDescription = checkbox.dataset.fieldDescription;
    const row = checkbox.closest('tr');
    
    if (checkbox.checked) {
        selectedFields.set(fieldId, fieldDescription);
        row.classList.add('selected');
    } else {
        selectedFields.delete(fieldId);
        row.classList.remove('selected');
    }
    
    updateSelectedFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

// Update the display of selected fields
function updateSelectedFieldsDisplay() {
    const selectedFieldsList = document.getElementById('selectedFieldsList');
    const selectedFieldsSection = document.getElementById('selectedFieldsSection');
    
    if (selectedFields.size === 0) {
        selectedFieldsSection.style.display = 'none';
        return;
    }
    
    selectedFieldsSection.style.display = 'block';
    selectedFieldsList.innerHTML = '';
    
    selectedFields.forEach((description, fieldId) => {
        const fieldItem = document.createElement('div');
        fieldItem.className = 'selected-field-item';
        fieldItem.textContent = `${fieldId}: ${description}`;
        selectedFieldsList.appendChild(fieldItem);
    });
}

// Clear all selections
function clearSelection() {
    selectedFields.clear();
    
    // Uncheck all checkboxes and remove selected class
    document.querySelectorAll('.field-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('tr').classList.remove('selected');
    });
    
    updateSelectedFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

// Process selected fields using Coze API
async function processSelectedFields() {
    if (selectedFields.size === 0) {
        alert('Please select at least one field');
        return;
    }
    
    // Show loading overlay with Coze API specific message
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingContent = loadingOverlay.querySelector('.loading-content');
    loadingContent.innerHTML = `
        <h3>🚀 Sending Request to Coze API...</h3>
        <p>Processing ${selectedFields.size} selected fields through Coze workflow</p>
        <p style="font-size: 14px; color: #666; margin-top: 10px;">
            📡 Connecting to Coze API...<br>
            ⚙️ Running workflow analysis...<br>
            📊 Generating insights...
        </p>
    `;
    loadingOverlay.style.display = 'flex';
    
    try {
        // Prepare the data in the required format {"id":"description"}
        const selectedFieldsObject = {};
        selectedFields.forEach((description, fieldId) => {
            selectedFieldsObject[fieldId] = description;
        });
        
        // Get Coze API configuration
        const cozeApiToken = document.getElementById('cozeApiTokenInput').value;
        const workflowId = document.getElementById('workflowIdInput').value;
        
        // Validate inputs
        if (!cozeApiToken) {
            alert('Please enter a Coze API token');
            document.getElementById('loadingOverlay').style.display = 'none';
            return;
        }
        
        if (!workflowId) {
            alert('Please enter a Workflow ID');
            document.getElementById('loadingOverlay').style.display = 'none';
            return;
        }
        
        // Update loading message to show API call is happening
        loadingContent.innerHTML = `
            <h3>📡 Coze API Request in Progress...</h3>
            <p>Workflow ID: ${workflowId}</p>
            <p>Selected Fields: ${Object.keys(selectedFieldsObject).join(', ')}</p>
            <p style="font-size: 14px; color: #4caf50; margin-top: 10px;">
                ✅ API credentials validated<br>
                🔄 Sending request to Coze servers...<br>
                ⏳ Please wait for response...
            </p>
        `;
        
        console.log('🚀 Starting Coze API request...');
        console.log('📋 Selected fields:', selectedFieldsObject);
        console.log('🔑 Using API token ending with:', cozeApiToken.slice(-10));
        console.log('⚙️ Workflow ID:', workflowId);
        
        // Call the process endpoint
        const response = await fetch('/idea-house/api/process-fields', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                selected_fields: selectedFieldsObject,
                coze_api_token: cozeApiToken,
                workflow_id: workflowId,
                dataset_description: window.currentDatasetDescription || ''
            })
        });
        
        console.log('📡 Received response from server');
        
        const result = await response.json();
        
        if (!response.ok) {
            console.error('❌ Coze API request failed:', result.error);
            throw new Error(result.error || 'Failed to process fields');
        }
        
        console.log('✅ Coze API request successful!');
        console.log('📊 Result:', result);
        
        // Update loading message to show success
        loadingContent.innerHTML = `
            <h3>✅ Coze API Response Received!</h3>
            <p style="color: #4caf50;">Successfully processed through workflow</p>
            <p style="font-size: 14px; margin-top: 10px;">
                📥 Response received from Coze<br>
                🎉 Formatting results...
            </p>
        `;
        
        // Small delay to show the success message
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Display results
        displayResults(result);
        
    } catch (error) {
        console.error('💥 Failed to process fields via Coze API:', error);
        alert(`Failed to process fields via Coze API: ${error.message}`);
    } finally {
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
        
        // Reset loading content for next time
        loadingContent.innerHTML = `
            <h3>Processing...</h3>
            <p>Please wait while we analyze your selected fields...</p>
        `;
    }
}

// Display results in markdown format
function displayResults(result) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    
    // Show results section
    resultsSection.style.display = 'block';
    
    // Format the results as markdown - simplified version
    let markdown = '# Analysis Results\n\n';
    
    // Add selected fields section
    markdown += '## Selected Fields\n\n';
    Object.entries(result.selected_fields).forEach(([fieldId, description]) => {
        markdown += `- **${fieldId}**: ${description}\n`;
    });
    markdown += '\n';
    
    // Add output section - only show the actual analysis output
    markdown += '## Analysis Output\n\n';
    if (result.output) {
        // If the output is already formatted text, use it directly
        if (typeof result.output === 'string') {
            markdown += result.output;
        } else {
            // If it's an object, try to display it nicely
            markdown += '```json\n';
            markdown += JSON.stringify(result.output, null, 2);
            markdown += '\n```\n';
        }
    } else {
        markdown += '_No output data available_';
    }
    
    // Render the markdown as HTML
    resultsContent.innerHTML = renderMarkdown(markdown);
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Helper function to format markdown (optional enhancement)
function renderMarkdown(markdown) {
    // This is an improved markdown renderer that handles lists better
    let html = markdown;
    
    // First, escape HTML to prevent XSS
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
    
    // Code blocks (must be before inline code)
    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
        return '<pre><code>' + code.trim() + '</code></pre>';
    });
    
    // Headers
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold (must be before italic)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Handle lists more carefully
    // Split into lines for better list processing
    const lines = html.split('\n');
    let inList = false;
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Check if line is a list item
        if (line.match(/^[\*\-\+] /)) {
            // Replace list marker with proper HTML
            line = line.replace(/^[\*\-\+] (.*)$/, '<li>$1</li>');
            
            // If not in a list, start one
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(line);
        } else if (line.match(/^\d+\. /)) {
            // Ordered list
            line = line.replace(/^\d+\. (.*)$/, '<li>$1</li>');
            
            // If not in a list or previous was unordered, start ordered list
            if (!inList || (i > 0 && lines[i-1].match(/^[\*\-\+] /))) {
                if (inList) processedLines.push('</ul>');
                processedLines.push('<ol>');
                inList = true;
            }
            processedLines.push(line);
        } else {
            // Not a list item
            if (inList) {
                // Close the list
                if (i > 0 && lines[i-1].match(/^\d+\. /)) {
                    processedLines.push('</ol>');
                } else {
                    processedLines.push('</ul>');
                }
                inList = false;
            }
            processedLines.push(line);
        }
    }
    
    // Close any remaining list
    if (inList) {
        if (lines[lines.length - 1].match(/^\d+\. /)) {
            processedLines.push('</ol>');
        } else {
            processedLines.push('</ul>');
        }
    }
    
    html = processedLines.join('\n');
    
    // Line breaks - convert double newlines to paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>|<ol>|<pre>)/g, '$1');
    html = html.replace(/(<\/ul>|<\/ol>|<\/pre>)<\/p>/g, '$1');
    
    // Single line breaks within paragraphs
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Save Coze configuration to localStorage
function saveCozeConfig() {
    const cozeApiToken = document.getElementById('cozeApiTokenInput').value;
    const workflowId = document.getElementById('workflowIdInput').value;
    
    // Save to localStorage
    localStorage.setItem('coze_api_token', cozeApiToken);
    localStorage.setItem('coze_workflow_id', workflowId);
    
    // Show success message
    const messageElement = document.getElementById('saveConfigMessage');
    messageElement.style.display = 'inline';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 3000);
}

// Load saved Coze configuration from localStorage
function loadSavedCozeConfig() {
    const savedToken = localStorage.getItem('coze_api_token');
    const savedWorkflowId = localStorage.getItem('coze_workflow_id');
    
    if (savedToken) {
        document.getElementById('cozeApiTokenInput').value = savedToken;
    }
    
    if (savedWorkflowId) {
        document.getElementById('workflowIdInput').value = savedWorkflowId;
    }
}

// Clear Coze configuration and reset to defaults
function clearCozeConfig() {
    // Remove from localStorage
    localStorage.removeItem('coze_api_token');
    localStorage.removeItem('coze_workflow_id');
    
    // Reset to default values
    document.getElementById('cozeApiTokenInput').value = 'pat_OCxUpnmL7hCvUxEWwcKL5XwUOdoiA3eWLzwY6L8W9sQVN1saJnoMrDNyhFhEn63l';
    document.getElementById('workflowIdInput').value = '7522912027267956786';
    
    // Show message
    const messageElement = document.getElementById('saveConfigMessage');
    messageElement.textContent = 'Configuration reset to default!';
    messageElement.style.color = '#ff9800';
    messageElement.style.display = 'inline';
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageElement.style.display = 'none';
        messageElement.textContent = 'Configuration saved!';
        messageElement.style.color = '#4caf50';
    }, 3000);
}

// Set up filter event listeners
function setupFilterEventListeners() {
    // Quick filter checkboxes
    const highCoverageFilter = document.getElementById('filterHighCoverage');
    const popularFilter = document.getElementById('filterPopular');
    const matrixOnlyFilter = document.getElementById('filterMatrixOnly');
    
    // Filter action buttons
    const selectAllBtn = document.getElementById('selectAllFiltered');
    const clearAllBtn = document.getElementById('clearAllSelected');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    // Set up quick filter listeners
    if (highCoverageFilter) highCoverageFilter.onchange = () => populateDataFieldsTable();
    if (popularFilter) popularFilter.onchange = () => populateDataFieldsTable();
    if (matrixOnlyFilter) matrixOnlyFilter.onchange = () => populateDataFieldsTable();
    
    // Set up action button listeners
    if (selectAllBtn) selectAllBtn.onclick = selectAllFilteredFields;
    if (clearAllBtn) clearAllBtn.onclick = clearAllSelectedFields;
    
    if (selectAllCheckbox) {
        selectAllCheckbox.onclick = (e) => {
            e.stopPropagation();
            if (selectAllCheckbox.checked) {
                selectAllFilteredFields();
            } else {
                clearAllFilteredFields();
            }
        };
    }
    
    // Column filter listeners
    document.querySelectorAll('.column-filter').forEach(filter => {
        filter.addEventListener('input', (e) => {
            const column = e.target.dataset.column;
            const value = e.target.value;
            
            if (column === 'userCount' || column === 'alphaCount') {
                columnFilters[column] = value ? parseInt(value) : null;
            } else {
                columnFilters[column] = value;
            }
            
            // Add/remove active class
            if (value) {
                e.target.classList.add('active');
            } else {
                e.target.classList.remove('active');
            }
            
            populateDataFieldsTable();
        });
    });
    
    // Coverage range filters
    document.querySelectorAll('.column-filter-min, .column-filter-max').forEach(filter => {
        filter.addEventListener('input', (e) => {
            const isMin = e.target.classList.contains('column-filter-min');
            const value = e.target.value;
            
            if (isMin) {
                columnFilters.coverage.min = value ? parseFloat(value) : null;
            } else {
                columnFilters.coverage.max = value ? parseFloat(value) : null;
            }
            
            // Add/remove active class
            const minInput = e.target.parentElement.querySelector('.column-filter-min');
            const maxInput = e.target.parentElement.querySelector('.column-filter-max');
            
            if (minInput.value || maxInput.value) {
                minInput.classList.add('active');
                maxInput.classList.add('active');
            } else {
                minInput.classList.remove('active');
                maxInput.classList.remove('active');
            }
            
            populateDataFieldsTable();
        });
    });
    
    // Sort button listeners
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const column = e.target.dataset.column;
            
            // Reset all other sort buttons
            document.querySelectorAll('.sort-btn').forEach(b => {
                if (b !== e.target) {
                    b.classList.remove('asc', 'desc');
                    b.dataset.order = 'asc';
                }
            });
            
            // Toggle sort order
            if (sortColumn === column) {
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                sortColumn = column;
                sortOrder = 'asc';
            }
            
            e.target.dataset.order = sortOrder;
            e.target.classList.remove('asc', 'desc');
            e.target.classList.add(sortOrder);
            
            populateDataFieldsTable();
        });
    });
}

// Update data fields statistics
function updateDataFieldsStats() {
    const dataFieldsCountEl = document.getElementById('dataFieldsCount');
    const filteredCountEl = document.getElementById('filteredCount');
    const selectedCountEl = document.getElementById('selectedFieldsCount');
    
    if (dataFieldsCountEl) dataFieldsCountEl.textContent = `${dataFields.length} fields loaded`;
    if (filteredCountEl) filteredCountEl.textContent = `${filteredDataFields.length} filtered`;
    if (selectedCountEl) selectedCountEl.textContent = `${selectedFields.size} selected`;
}

// Populate type filter dropdown
function populateTypeFilter() {
    const typeFilter = document.getElementById('typeFilter');
    if (!typeFilter) return;
    
    // Get unique types from current data fields
    const uniqueTypes = [...new Set(dataFields.map(field => field.type))].sort();
    
    // Clear existing options except "All Types"
    typeFilter.innerHTML = '<option value="">All Types</option>';
    
    uniqueTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });
    
    // Restore selected value if it exists
    if (columnFilters.type && uniqueTypes.includes(columnFilters.type)) {
        typeFilter.value = columnFilters.type;
    }
}

// Select all filtered fields
function selectAllFilteredFields() {
    filteredDataFields.forEach(field => {
        selectedFields.set(field.id, field.description);
        const row = document.querySelector(`tr[data-field-id="${field.id}"]`);
        if (row) {
            const checkbox = row.querySelector('.field-checkbox');
            checkbox.checked = true;
            row.classList.add('selected');
        }
    });
    
    updateSelectedFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

// Clear all selected fields
function clearAllSelectedFields() {
    selectedFields.clear();
    
    // Update all checkboxes
    document.querySelectorAll('.field-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('tr').classList.remove('selected');
    });
    
    updateSelectedFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

// Clear only filtered fields
function clearAllFilteredFields() {
    filteredDataFields.forEach(field => {
        selectedFields.delete(field.id);
        const row = document.querySelector(`tr[data-field-id="${field.id}"]`);
        if (row) {
            const checkbox = row.querySelector('.field-checkbox');
            checkbox.checked = false;
            row.classList.remove('selected');
        }
    });
    
    updateSelectedFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

// Update the select all checkbox state
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;
    
    const allFilteredSelected = filteredDataFields.length > 0 && 
        filteredDataFields.every(field => selectedFields.has(field.id));
    
    selectAllCheckbox.checked = allFilteredSelected;
    selectAllCheckbox.indeterminate = !allFilteredSelected && 
        filteredDataFields.some(field => selectedFields.has(field.id));
}

// Display dataset description
function displayDatasetDescription(description) {
    console.log('🎨 Displaying dataset description:', description);
    
    // Check if dataset description element already exists
    let descriptionElement = document.getElementById('datasetDescription');
    
    if (!descriptionElement) {
        console.log('📌 Creating new dataset description element');
        
        // Create the element if it doesn't exist
        const tableContainer = document.getElementById('tableContainer');
        const dataFieldsControls = tableContainer.querySelector('.data-fields-controls');
        
        // Create a new div for the dataset description
        descriptionElement = document.createElement('div');
        descriptionElement.id = 'datasetDescription';
        descriptionElement.className = 'dataset-description';
        descriptionElement.style.cssText = `
            padding: 15px;
            background: #e8f5e9;
            border: 1px solid #4caf50;
            border-radius: 4px;
            margin-bottom: 15px;
            font-size: 14px;
            line-height: 1.5;
        `;
        
        // Insert it before the controls
        tableContainer.insertBefore(descriptionElement, dataFieldsControls);
        console.log('✅ Dataset description element created and inserted');
    } else {
        console.log('📌 Using existing dataset description element');
    }
    
    // Update the content
    descriptionElement.innerHTML = `
        <strong>Dataset Description:</strong><br>
        ${description}
    `;
    console.log('✅ Dataset description content updated');
} 