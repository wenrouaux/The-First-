/**
 * Main Application Script
 * Handles editor functionality, grammar checking, and template management
 * The 'templates' global variable is used by decoder.js module
 */

// Global variables
let currentTemplate = null;
let currentConfigType = null;
let templates = new Map(); // Used by decoder.js for template decoding

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('expressionEditor');
    const decodeTemplatesBtn = document.getElementById('decodeTemplates');
    const detectTemplatesBtn = document.getElementById('detectTemplates');
    const clearEditorBtn = document.getElementById('clearEditor');
    
    // Initialize navigation
    initializeNavigation();
    
    // Debounce timer for automatic grammar checking
    let grammarCheckTimer;
    
    // Update line numbers when content changes
    editor.addEventListener('input', function(e) {
        updateLineNumbers();
        updateSyntaxHighlight();
        
        // Handle auto-completion
        handleAutoComplete(e);
        
        // Clear previous timer
        clearTimeout(grammarCheckTimer);
        
        // Set new timer for automatic grammar check (300ms delay)
        grammarCheckTimer = setTimeout(function() {
            checkGrammar();
            detectTemplates();
        }, 300);
    });
    
    // Handle keydown events for Tab completion and other keys
    editor.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            handleTabCompletion();
        } else if (e.key === 'Escape') {
            // Allow users to dismiss the shadow suggestion
            hideShadowSuggestion();
            autoCompleteActive = false;
        }
    });
    
    editor.addEventListener('scroll', syncScroll);
    
    // Hide shadow suggestion when editor loses focus
    editor.addEventListener('blur', function() {
        hideShadowSuggestion();
        autoCompleteActive = false;
    });
    
    // Button event listeners
    decodeTemplatesBtn.addEventListener('click', decodeTemplates);
    clearEditorBtn.addEventListener('click', clearEditor);
    
    // Random iteration button
    const randomIterationBtn = document.getElementById('randomIterationBtn');
    if (randomIterationBtn) {
        randomIterationBtn.addEventListener('click', randomIteration);
    }
    
    // BRAIN connection button
    const connectToBrainBtn = document.getElementById('connectToBrain');
    connectToBrainBtn.addEventListener('click', openBrainLoginModal);
    
    // Simulator button - removed as requested
    // const runSimulatorBtn = document.getElementById('runSimulator');
    // if (runSimulatorBtn) {
    //     runSimulatorBtn.addEventListener('click', runSimulator);
    // }
    
    // Results button listeners
    const copyDisplayedBtn = document.getElementById('copyDisplayedResults');
    const copyAllBtn = document.getElementById('copyAllResults');
    const downloadBtn = document.getElementById('downloadResults');
    const nextMoveBtn = document.getElementById('nextMoveBtn');
    if (copyDisplayedBtn) copyDisplayedBtn.addEventListener('click', copyDisplayedResults);
    if (copyAllBtn) copyAllBtn.addEventListener('click', copyAllResults);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadResults);
    if (nextMoveBtn) nextMoveBtn.addEventListener('click', openSettingsModal);
    
    // Initialize line numbers and syntax highlighting
    updateLineNumbers();
    updateSyntaxHighlight();
    
    // Auto-detect templates and check grammar on load
    detectTemplates();
    checkGrammar();
    
    // Handle Enter key in variable input
    const variableInput = document.getElementById('variableInput');
    variableInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            applyTemplate();
        }
    });
    
    // Update line numbers on window resize
    window.addEventListener('resize', function() {
        updateLineNumbers();
    });
    
    // Load custom templates on startup
    loadCustomTemplates();
});

// Custom Templates Management (Server-side storage)

// Load custom templates from server
async function loadCustomTemplates() {
    try {
        const response = await fetch('/api/templates');
        const customTemplates = await response.json();
        
        const buttonsContainer = document.getElementById('customTemplateButtons');
        const noTemplatesInfo = document.getElementById('noCustomTemplates');
        
        if (!buttonsContainer) {
            console.error('customTemplateButtons container not found!');
            return;
        }
        
        buttonsContainer.innerHTML = '';
        
        if (!Array.isArray(customTemplates) || customTemplates.length === 0) {
            // Only show "no templates" message if we're viewing custom or all templates
            if (noTemplatesInfo && (currentTemplateView === 'all' || currentTemplateView === 'custom')) {
                noTemplatesInfo.style.display = 'block';
            }
        } else {
            if (noTemplatesInfo) {
                noTemplatesInfo.style.display = 'none';
            }
            
            customTemplates.forEach((template, index) => {
                const button = document.createElement('button');
                button.className = 'btn btn-template btn-template-custom';
                button.setAttribute('data-template-type', 'custom');
                button.innerHTML = `
                    ${template.name}
                    <span class="delete-btn" onclick="deleteCustomTemplate(${index}, event)" title="Delete template">×</span>
                `;
                button.onclick = () => loadCustomTemplate(index);
                button.title = template.description || 'Click to load this template';
                
                buttonsContainer.appendChild(button);
            });
        }
    } catch (error) {
        console.error('Error loading templates:', error);
        showNotification('Error loading templates', 'error');
    }
}

// Save current template
function saveCurrentTemplate() {
    const editor = document.getElementById('expressionEditor');
    const expression = editor.value.trim();
    
    if (!expression) {
        showNotification('Please enter an expression before saving', 'error');
        return;
    }
    
    // Show save modal
    const modal = document.getElementById('saveTemplateModal');
    const preview = document.getElementById('templatePreview');
    const nameInput = document.getElementById('templateName');
    const descInput = document.getElementById('templateDescription');
    const configurationsInfo = document.getElementById('templateConfigurationsInfo');
    const configurationsList = document.getElementById('configurationsList');
    
    preview.textContent = expression;
    nameInput.value = '';
    descInput.value = '';
    
    // Check for configured templates and show info
    const configuredTemplates = [];
    templates.forEach((template, templateName) => {
        if (template.variables && template.variables.length > 0 && template.configType) {
            configuredTemplates.push({
                name: templateName,
                type: template.configType,
                count: template.variables.length
            });
        }
    });
    
    if (configuredTemplates.length > 0) {
        configurationsList.innerHTML = configuredTemplates.map(config => 
            `<li>&lt;${config.name}/&gt; - ${config.type} (${config.count} values)</li>`
        ).join('');
        configurationsInfo.style.display = 'block';
    } else {
        configurationsInfo.style.display = 'none';
    }
    
    modal.style.display = 'block';
    nameInput.focus();
    
    // Add Enter key support
    const handleEnter = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            confirmSaveTemplate();
        }
    };
    nameInput.addEventListener('keydown', handleEnter);
    descInput.addEventListener('keydown', handleEnter);
    
    // Clean up event listeners when modal closes
    modal.addEventListener('close', () => {
        nameInput.removeEventListener('keydown', handleEnter);
        descInput.removeEventListener('keydown', handleEnter);
    });
}

// Close save template modal
function closeSaveTemplateModal() {
    const modal = document.getElementById('saveTemplateModal');
    modal.style.display = 'none';
}

// Overwrite existing template
async function overwriteExistingTemplate() {
    const editor = document.getElementById('expressionEditor');
    const expression = editor.value.trim();
    
    if (!expression) {
        showNotification('Please enter an expression before overwriting a template', 'error');
        return;
    }
    
    // Check if there are any custom templates first
    try {
        const response = await fetch('/api/templates');
        const customTemplates = await response.json();
        
        if (!Array.isArray(customTemplates) || customTemplates.length === 0) {
            showNotification('No custom templates available to overwrite. Create a template first using "Save Current Template".', 'warning');
            return;
        }
    } catch (error) {
        console.error('Error checking templates:', error);
        showNotification('Error checking existing templates', 'error');
        return;
    }
    
    // Show overwrite modal
    const modal = document.getElementById('overwriteTemplateModal');
    const preview = document.getElementById('overwriteTemplatePreview');
    const templateSelect = document.getElementById('existingTemplateSelect');
    const confirmBtn = document.getElementById('overwriteConfirmBtn');
    const configurationsInfo = document.getElementById('overwriteConfigurationsInfo');
    const configurationsList = document.getElementById('overwriteConfigurationsList');
    
    preview.textContent = expression;
    
    // Reset UI
    templateSelect.value = '';
    confirmBtn.disabled = true;
    document.getElementById('selectedTemplateInfo').style.display = 'none';
    
    // Check for configured templates and show info
    const configuredTemplates = [];
    templates.forEach((template, templateName) => {
        if (template.variables && template.variables.length > 0 && template.configType) {
            configuredTemplates.push({
                name: templateName,
                type: template.configType,
                count: template.variables.length
            });
        }
    });
    
    if (configuredTemplates.length > 0) {
        configurationsList.innerHTML = configuredTemplates.map(config => 
            `<li>&lt;${config.name}/&gt; - ${config.type} (${config.count} values)</li>`
        ).join('');
        configurationsInfo.style.display = 'block';
    } else {
        configurationsInfo.style.display = 'none';
    }
    
    // Load existing templates for dropdown
    loadExistingTemplatesForOverwrite();
    
    // Add event listener for template selection
    templateSelect.onchange = handleTemplateSelectionForOverwrite;
    
    modal.style.display = 'block';
}

// Load existing templates for the overwrite dropdown
async function loadExistingTemplatesForOverwrite() {
    try {
        const response = await fetch('/api/templates');
        const customTemplates = await response.json();
        const templateSelect = document.getElementById('existingTemplateSelect');
        
        // Clear existing options except the first one
        templateSelect.innerHTML = '<option value="">Select a template...</option>';
        
        if (Array.isArray(customTemplates) && customTemplates.length > 0) {
            customTemplates.forEach((template, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = template.name;
                option.dataset.description = template.description || '';
                templateSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.textContent = 'No custom templates available';
            option.disabled = true;
            templateSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Error loading templates for overwrite:', error);
        showNotification('Error loading templates', 'error');
    }
}

// Handle template selection for overwrite
function handleTemplateSelectionForOverwrite() {
    const templateSelect = document.getElementById('existingTemplateSelect');
    const selectedTemplateInfo = document.getElementById('selectedTemplateInfo');
    const currentTemplateDescription = document.getElementById('currentTemplateDescription');
    const confirmBtn = document.getElementById('overwriteConfirmBtn');
    
    if (templateSelect.value === '') {
        selectedTemplateInfo.style.display = 'none';
        confirmBtn.disabled = true;
        return;
    }
    
    // Show selected template info
    const selectedOption = templateSelect.options[templateSelect.selectedIndex];
    const description = selectedOption.dataset.description || 'No description';
    
    currentTemplateDescription.textContent = description;
    selectedTemplateInfo.style.display = 'block';
    confirmBtn.disabled = false;
}

// Close overwrite template modal
function closeOverwriteTemplateModal() {
    const modal = document.getElementById('overwriteTemplateModal');
    modal.style.display = 'none';
}

// Confirm and overwrite template
async function confirmOverwriteTemplate() {
    const templateSelect = document.getElementById('existingTemplateSelect');
    const editor = document.getElementById('expressionEditor');
    
    if (templateSelect.value === '') {
        showNotification('Please select a template to overwrite', 'error');
        return;
    }
    
    const selectedIndex = parseInt(templateSelect.value);
    const selectedTemplateName = templateSelect.options[templateSelect.selectedIndex].textContent;
    
    // Confirm the overwrite action
    if (!confirm(`Are you sure you want to overwrite the template "${selectedTemplateName}"? This action cannot be undone.`)) {
        return;
    }
    
    const expression = editor.value.trim();
    
    // Capture current template configurations
    const templateConfigurations = {};
    templates.forEach((template, templateName) => {
        if (template.variables && template.variables.length > 0 && template.configType) {
            templateConfigurations[templateName] = {
                variables: template.variables,
                configType: template.configType
            };
        }
    });
    
    try {
        // First get the existing template to preserve its name and original creation date
        const response = await fetch('/api/templates');
        const customTemplates = await response.json();
        
        if (!Array.isArray(customTemplates) || selectedIndex >= customTemplates.length) {
            showNotification('Selected template not found', 'error');
            return;
        }
        
        const existingTemplate = customTemplates[selectedIndex];
        
        // Update the template with new expression and configurations
        const updateResponse = await fetch('/api/templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: existingTemplate.name, // Keep the original name
                description: existingTemplate.description, // Keep the original description
                expression: expression,
                templateConfigurations: templateConfigurations
            })
        });
        
        const result = await updateResponse.json();
        
        if (result.success) {
            // Close modal and reload templates
            closeOverwriteTemplateModal();
            loadCustomTemplates();
            showNotification(`Template "${existingTemplate.name}" overwritten successfully`, 'success');
        } else {
            showNotification(result.error || 'Error overwriting template', 'error');
        }
    } catch (error) {
        console.error('Error overwriting template:', error);
        showNotification('Error overwriting template', 'error');
    }
}

// Confirm and save template
async function confirmSaveTemplate() {
    const nameInput = document.getElementById('templateName');
    const descInput = document.getElementById('templateDescription');
    const editor = document.getElementById('expressionEditor');
    
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    const expression = editor.value.trim();
    
    if (!name) {
        showNotification('Please enter a name for the template', 'error');
        nameInput.focus();
        return;
    }
    
    // Capture current template configurations
    const templateConfigurations = {};
    templates.forEach((template, templateName) => {
        if (template.variables && template.variables.length > 0 && template.configType) {
            templateConfigurations[templateName] = {
                variables: template.variables,
                configType: template.configType
            };
        }
    });
    
    try {
        const response = await fetch('/api/templates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                description: description,
                expression: expression,
                templateConfigurations: templateConfigurations
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Close modal and reload templates
            closeSaveTemplateModal();
            loadCustomTemplates();
            showNotification(result.message, 'success');
        } else {
            showNotification(result.error || 'Error saving template', 'error');
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showNotification('Error saving template', 'error');
    }
}

// Load a custom template
async function loadCustomTemplate(index) {
    try {
        const response = await fetch('/api/templates');
        const customTemplates = await response.json();
        
        if (Array.isArray(customTemplates) && index >= 0 && index < customTemplates.length) {
            const template = customTemplates[index];
            const editor = document.getElementById('expressionEditor');
            
            editor.value = template.expression;
            updateLineNumbers();
            updateSyntaxHighlight();
            checkGrammar();
            detectTemplates();
            
            // Restore template configurations if they exist
            if (template.templateConfigurations) {
                setTimeout(() => {
                    Object.entries(template.templateConfigurations).forEach(([templateName, config]) => {
                        if (templates.has(templateName) && config.variables && config.configType) {
                            const templateObj = templates.get(templateName);
                            templateObj.variables = config.variables;
                            templateObj.configType = config.configType;
                            
                            // Update visual state
                            if (templateObj.element) {
                                templateObj.element.className = 'template-item configured';
                            }
                            updateTemplateCount(templateName);
                        }
                    });
                    
                    // Update the overall template status
                    updateTemplateStatus();
                }, 100); // Small delay to ensure templates are detected first
            }
            
            showNotification(`Loaded template: ${template.name}`, 'success');
        }
    } catch (error) {
        console.error('Error loading template:', error);
        showNotification('Error loading template', 'error');
    }
}

// Delete a custom template
async function deleteCustomTemplate(index, event) {
    event.stopPropagation(); // Prevent button click from triggering
    
    try {
        const response = await fetch('/api/templates');
        const customTemplates = await response.json();
        
        if (Array.isArray(customTemplates) && index >= 0 && index < customTemplates.length) {
            const template = customTemplates[index];
            
            if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
                const deleteResponse = await fetch(`/api/templates/${index}`, {
                    method: 'DELETE'
                });
                
                const result = await deleteResponse.json();
                
                if (result.success) {
                    loadCustomTemplates();
                    showNotification(result.message, 'info');
                } else {
                    showNotification(result.error || 'Error deleting template', 'error');
                }
            }
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showNotification('Error deleting template', 'error');
    }
}

// Export custom templates to JSON file
async function exportCustomTemplates() {
    try {
        const response = await fetch('/api/templates/export');
        const customTemplates = await response.json();
        
        if (!Array.isArray(customTemplates) || customTemplates.length === 0) {
            showNotification('No custom templates to export', 'warning');
            return;
        }
        
        const dataStr = JSON.stringify(customTemplates, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `brain_custom_templates_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification(`Exported ${customTemplates.length} template${customTemplates.length > 1 ? 's' : ''}`, 'success');
    } catch (error) {
        console.error('Error exporting templates:', error);
        showNotification('Error exporting templates', 'error');
    }
}

// Import custom templates from JSON file
function importCustomTemplates(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedTemplates = JSON.parse(e.target.result);
            
            if (!Array.isArray(importedTemplates)) {
                throw new Error('Invalid template file format');
            }
            
            // Validate template structure
            const validTemplates = importedTemplates.filter(t => 
                t.name && typeof t.name === 'string' &&
                t.expression && typeof t.expression === 'string'
            );
            
            if (validTemplates.length === 0) {
                throw new Error('No valid templates found in file');
            }
            
            // Get existing templates to check for duplicates
            const response = await fetch('/api/templates');
            const existingTemplates = await response.json();
            
            // Check for duplicates
            const duplicates = validTemplates.filter(imported => 
                Array.isArray(existingTemplates) && existingTemplates.some(existing => existing.name === imported.name)
            );
            
            let overwrite = false;
            if (duplicates.length > 0) {
                const duplicateNames = duplicates.map(t => t.name).join(', ');
                overwrite = confirm(`The following templates already exist: ${duplicateNames}\n\nDo you want to overwrite them?`);
                
                if (!overwrite) {
                    // Filter out duplicates if user doesn't want to overwrite
                    const nonDuplicates = validTemplates.filter(imported => 
                        !Array.isArray(existingTemplates) || !existingTemplates.some(existing => existing.name === imported.name)
                    );
                    
                    if (nonDuplicates.length === 0) {
                        showNotification('Import cancelled - all templates already exist', 'info');
                        event.target.value = ''; // Reset file input
                        return;
                    }
                }
            }
            
            // Import templates
            const importResponse = await fetch('/api/templates/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    templates: validTemplates,
                    overwrite: overwrite
                })
            });
            
            const result = await importResponse.json();
            
            if (result.success) {
                loadCustomTemplates();
                
                let message = `Imported ${result.imported} new template${result.imported !== 1 ? 's' : ''}`;
                if (result.overwritten > 0) {
                    message += `, overwritten ${result.overwritten}`;
                }
                showNotification(message, 'success');
            } else {
                showNotification(result.error || 'Import failed', 'error');
            }
            
        } catch (error) {
            showNotification(`Import failed: ${error.message}`, 'error');
        }
        
        event.target.value = ''; // Reset file input
    };
    
    reader.readAsText(file);
}

// Run simulator script
function runSimulator() {
    // Show modal with two options
    showSimulatorOptionsModal();
}

function showSimulatorOptionsModal() {
    // Create modal HTML if it doesn't exist
    let modal = document.getElementById('simulatorOptionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'simulatorOptionsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h3>🚀 Run Simulator</h3>
                    <span class="close" onclick="closeSimulatorOptionsModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 20px;">选择您想要运行 BRAIN Alpha 模拟器的方式：</p>
                    
                    <div class="simulator-options">
                        <div class="simulator-option" onclick="runTraditionalSimulator()">
                            <div class="option-icon">⚙️</div>
                            <div class="option-content">
                                <h4>命令行界面</h4>
                                <p>传统的交互式命令行界面，带有逐步提示。</p>
                                <ul>
                                    <li>交互式参数输入</li>
                                    <li>逐步配置</li>
                                    <li>适合熟悉命令行的高级用户</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="simulator-option" onclick="runWebSimulator()">
                            <div class="option-icon">🌐</div>
                            <div class="option-content">
                                <h4>Web 界面</h4>
                                <p>用户友好的 Web 表单，所有参数集中在一个页面。</p>
                                <ul>
                                    <li>所有参数在一个表单中</li>
                                    <li>实时日志监控</li>
                                    <li>可视化进度跟踪</li>
                                    <li>对初学者友好的界面</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'block';
}

function closeSimulatorOptionsModal() {
    const modal = document.getElementById('simulatorOptionsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function runTraditionalSimulator() {
    closeSimulatorOptionsModal();
    
    try {
        const response = await fetch('/api/run-simulator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.error || 'Failed to run simulator', 'error');
        }
    } catch (error) {
        console.error('Error running simulator:', error);
        showNotification('Error running simulator', 'error');
    }
}

function runWebSimulator() {
    closeSimulatorOptionsModal();
    // Navigate to the new simulator page
    window.location.href = '/simulator';
}

async function openSubmitter() {
    try {
        const response = await fetch('/api/open-submitter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.error || 'Failed to open submitter', 'error');
        }
    } catch (error) {
        console.error('Error opening submitter:', error);
        showNotification('Error opening submitter', 'error');
    }
}

async function openHKSimulator() {
    try {
        const response = await fetch('/api/open-hk-simulator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
        } else {
            showNotification(result.error || 'Failed to open HK simulator', 'error');
        }
    } catch (error) {
        console.error('Error opening HK simulator:', error);
        showNotification('Error opening HK simulator', 'error');
    }
}

// Make functions globally accessible
window.saveCurrentTemplate = saveCurrentTemplate;
window.closeSaveTemplateModal = closeSaveTemplateModal;
window.confirmSaveTemplate = confirmSaveTemplate;
window.overwriteExistingTemplate = overwriteExistingTemplate;
window.openSubmitter = openSubmitter;
window.openHKSimulator = openHKSimulator;
window.closeOverwriteTemplateModal = closeOverwriteTemplateModal;
window.confirmOverwriteTemplate = confirmOverwriteTemplate;
window.loadCustomTemplate = loadCustomTemplate;
window.deleteCustomTemplate = deleteCustomTemplate;
window.exportCustomTemplates = exportCustomTemplates;
window.importCustomTemplates = importCustomTemplates;
window.runSimulator = runSimulator;
window.showSimulatorOptionsModal = showSimulatorOptionsModal;
window.closeSimulatorOptionsModal = closeSimulatorOptionsModal;
window.runTraditionalSimulator = runTraditionalSimulator;
window.runWebSimulator = runWebSimulator;

// Template View Toggle Functionality
let currentTemplateView = 'all'; // 'all', 'custom', 'example'

function toggleTemplateView() {
    const toggleBtn = document.getElementById('toggleTemplateView');
    const toggleText = document.getElementById('toggleTemplateViewText');
    const exampleTemplates = document.getElementById('exampleTemplateButtons');
    const customTemplates = document.getElementById('customTemplateButtons');
    const noTemplatesInfo = document.getElementById('noCustomTemplates');
    
    // Cycle through views: all -> custom -> example -> all
    if (currentTemplateView === 'all') {
        currentTemplateView = 'custom';
        toggleText.textContent = 'Show Examples Only';
        exampleTemplates.style.display = 'none';
        customTemplates.style.display = 'block';
        
        // Check if there are custom templates
        if (customTemplates.children.length === 0 && noTemplatesInfo) {
            noTemplatesInfo.style.display = 'block';
        }
    } else if (currentTemplateView === 'custom') {
        currentTemplateView = 'example';
        toggleText.textContent = 'Show All Templates';
        exampleTemplates.style.display = 'block';
        customTemplates.style.display = 'none';
        if (noTemplatesInfo) {
            noTemplatesInfo.style.display = 'none';
        }
    } else {
        currentTemplateView = 'all';
        toggleText.textContent = 'Show Custom Only';
        exampleTemplates.style.display = 'block';
        customTemplates.style.display = 'block';
        
        // Show no templates info only if in all view and no custom templates
        if (customTemplates.children.length === 0 && noTemplatesInfo) {
            noTemplatesInfo.style.display = 'block';
        } else if (noTemplatesInfo) {
            noTemplatesInfo.style.display = 'none';
        }
    }
}

// Make toggleTemplateView globally accessible
window.toggleTemplateView = toggleTemplateView;

// Load template examples
function loadTemplateExample(exampleNumber) {
    const editor = document.getElementById('expressionEditor');
    const examples = {
        1: `to_nan(
    group_normalize(
        group_neutralize(
            group_rank(
                ts_rank(
                    ts_decay_linear(
                        ts_returns(
                            ts_backfill(<data_field/>, <backfill_days/>)/<secondary_data_field/>, <returns_window/>
                        ), <decay_window/>
                    ), <rank_window/>
                ), <group/>
            ), <group/>
        ), <market/>
    ), value=<nan_value/>, reverse=<reverse_bool/>
)`,
        2: `ts_decay_exp_window(
    ts_max(
        vec_avg(<model_field/>), <max_window/>
    ), <decay_window/>
)`,
        3: `financial_data = ts_backfill(vec_func(<analyst_metric/>), <backfill_days/>);
gp = group_cartesian_product(<group1/>, <group2/>);
data = <ts_operator/>(
    <group_operator/>(financial_data, gp), <window/>
)`,
        4: `alpha = <cross_sectional_transform/>(
    <time_series_transform/>(<feature/>, <ts_window/>), <group/>
);
alpha_gpm = group_mean(alpha, <weight/>, <group/>);
resid = <neutralization_func/>(alpha, alpha_gpm);
final_signal = <time_series_transform2/>(
    group_neutralize(resid, <group2/>), <final_window/>
)`,
        5: `alpha = group_zscore(
    ts_zscore(
        ts_backfill(vec_avg(<analyst_field/>), <backfill_days/>), <zscore_window/>
    ), <exchange/>
);
alpha_gpm = group_mean(alpha, <cap_weight/>, <country/>);
resid = subtract(alpha, alpha_gpm);
ts_mean(group_neutralize(resid, <market/>), <mean_window/>)`,
        6: `data = ts_backfill(
    winsorize(vec_avg(<analyst_field/>), std=<std_value/>), <backfill_days/>
);
t_data = normalize(data);
gp = group_cartesian_product(<market/>, <country/>);
signal = group_normalize(ts_zscore(t_data, <zscore_window/>), gp);
gpm = group_mean(signal, 1, gp);
gpm_signal = subtract(signal, gpm);
opt = group_neutralize(
    arc_tan(ts_decay_exp_window(gpm_signal, <decay_window/>)), gp
);
ts_target_tvr_delta_limit(opt, ts_std_dev(opt, <std_window/>), target_tvr=<tvr_value/>)`,
        7: `group = <industry/>;
data = ts_min_max_cps(
    group_zscore(
        ts_backfill(vec_min(<model_field/>), <backfill_days/>), group
    ), <minmax_window/>
);
ts_data = ts_median(data, <median_window/>);
ts_target_tvr_hump(
    group_neutralize(subtract(data, ts_data), group), target_tvr=<tvr_value/>
)`
    };
    
    if (examples[exampleNumber]) {
        editor.value = examples[exampleNumber];
        updateLineNumbers();
        updateSyntaxHighlight();
        checkGrammar();
        detectTemplates();
        
        // Show a notification
        showNotification(`Loaded template example ${exampleNumber}`, 'success');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#48bb78' : '#667eea'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Make loadTemplateExample globally accessible
window.loadTemplateExample = loadTemplateExample;

// Initialize navigation system
function initializeNavigation() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            navigateToPage(targetPage);
        });
    });
}

// Navigate to a specific page
function navigateToPage(pageName) {
    // Update nav tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        if (tab.getAttribute('data-page') === pageName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Update page content
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => {
        if (page.id === pageName + 'Page') {
            page.classList.add('active');
        } else {
            page.classList.remove('active');
        }
    });
    
    // Update template status when navigating to decode page
    if (pageName === 'decode') {
        updateTemplateStatus();
    }
}

// Update template status on decode page
function updateTemplateStatus() {
    const statusDiv = document.getElementById('templateStatus');
    const decodeHeading = document.querySelector('#decodePage h2');
    const totalTemplates = templates.size;
    const configuredTemplates = Array.from(templates.values()).filter(t => t.variables.length > 0).length;
    
    // Reset heading to default
    decodeHeading.textContent = 'Template Decoding Options';
    
    if (totalTemplates === 0) {
        statusDiv.innerHTML = `
            <div class="info-message">
                No templates detected in your expression. 
                <button class="btn btn-secondary btn-small" onclick="navigateToPage('editor')">Go back to editor</button>
            </div>
        `;
    } else if (configuredTemplates === 0) {
        statusDiv.innerHTML = `
            <div class="warning-message">
                <strong>⚠️ No templates configured yet!</strong><br>
                You have ${totalTemplates} variable${totalTemplates > 1 ? 's' : ''} in your expression, but none are configured.<br>
                <button class="btn btn-secondary btn-small" onclick="navigateToPage('editor')">Configure templates</button>
            </div>
        `;
    } else if (configuredTemplates < totalTemplates) {
        statusDiv.innerHTML = `
            <div class="warning-message">
                <strong>⚠️ Some templates not configured!</strong><br>
                ${configuredTemplates} out of ${totalTemplates} templates are configured.<br>
                <button class="btn btn-secondary btn-small" onclick="navigateToPage('editor')">Configure remaining templates</button>
            </div>
        `;
    } else {
        // All templates configured - calculate search space
        let searchSpace = [];
        let totalCombinations = 1;
        
        templates.forEach((template, name) => {
            if (template.variables.length > 0) {
                searchSpace.push(template.variables.length);
                totalCombinations *= template.variables.length;
            }
        });
        
        // Update heading with search space
        const searchSpaceStr = searchSpace.join(' × ');
        decodeHeading.innerHTML = `Template Decoding Options <span class="search-space">(SearchSpace: ${searchSpaceStr} = ${totalCombinations.toLocaleString()})</span>`;
        
        let configDetails = '<ul style="margin: 10px 0; padding-left: 20px;">';
        templates.forEach((template, name) => {
            if (template.variables.length > 0) {
                configDetails += `<li><strong>&lt;${name}/&gt;</strong>: ${template.variables.length} ${template.configType || 'values'}</li>`;
            }
        });
        configDetails += '</ul>';
        
        statusDiv.innerHTML = `
            <div class="success-message">
                <strong>✓ All templates configured!</strong><br>
                ${configDetails}
                Ready to decode your expressions.
            </div>
        `;
    }
}

// Make navigateToPage globally accessible
window.navigateToPage = navigateToPage;

// Update line numbers in the editor
function updateLineNumbers() {
    const editor = document.getElementById('expressionEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const lines = editor.value.split('\n');
    
    // Calculate how many lines we need based on editor height
    const editorHeight = editor.offsetHeight || 500;
    const lineHeight = 25.6; // 16px font-size * 1.6 line-height
    const visibleLines = Math.ceil(editorHeight / lineHeight);
    const totalLines = Math.max(lines.length, visibleLines);
    
    // Build line numbers text
    let lineNumbersText = '';
    for (let i = 1; i <= totalLines; i++) {
        lineNumbersText += i + '\n';
    }
    
    // Remove trailing newline for better alignment
    lineNumbers.textContent = lineNumbersText.trimEnd();
}

// Sync scroll between editor and line numbers
function syncScroll() {
    const editor = document.getElementById('expressionEditor');
    const lineNumbers = document.getElementById('lineNumbers');
    const highlightedText = document.getElementById('highlightedText');
    
    lineNumbers.scrollTop = editor.scrollTop;
    highlightedText.scrollTop = editor.scrollTop;
    highlightedText.scrollLeft = editor.scrollLeft;
    
    // Hide shadow suggestion when scrolling
    hideShadowSuggestion();
}

// Update syntax highlighting
function updateSyntaxHighlight() {
    const editor = document.getElementById('expressionEditor');
    const highlightedText = document.getElementById('highlightedText');
    const text = editor.value;
    
    // Escape HTML special characters
    let escapedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    
    // Highlight template tags
    escapedText = escapedText.replace(/(&lt;)(\/?)(\w+)(\/&gt;)/g, function(match, open, slash, tagName, close) {
        return `<span class="template-brackets">${open}</span>` +
               `<span class="template-brackets">${slash}</span>` +
               `<span class="template-tag">${tagName}</span>` +
               `<span class="template-brackets">${close}</span>`;
    });
    
    highlightedText.innerHTML = escapedText;
}

// Grammar checking function
function checkGrammar() {
    const editor = document.getElementById('expressionEditor');
    const content = editor.value;
    const errorsDiv = document.getElementById('grammarErrors');
    const errors = [];
    
    // Clear previous errors
    errorsDiv.innerHTML = '';
    
    // Check for unclosed block comments
    const commentStart = content.match(/\/\*/g) || [];
    const commentEnd = content.match(/\*\//g) || [];
    if (commentStart.length !== commentEnd.length) {
        errors.push({
            type: 'error',
            message: 'Unclosed block comment detected. Each /* must have a matching */'
        });
    }
    
    // Remove comments for statement detection
    let contentWithoutComments = content.replace(/\/\*[\s\S]*?\*\//g, '').trim();
    
    // Check if content is empty after removing comments
    if (!contentWithoutComments) {
        errorsDiv.innerHTML = '<div class="info-message">Enter an expression to check grammar</div>';
        return;
    }
    
    // Detect statements by looking for assignment patterns (variable = expression)
    // or by semicolons
    const lines = contentWithoutComments.split('\n');
    let statements = [];
    let currentStatement = '';
    let statementStartLine = 0;
    let openParens = 0;
    let openBrackets = 0;
    let inStatement = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (trimmedLine === '') {
            if (currentStatement.trim()) {
                currentStatement += '\n';
            }
            continue;
        }
        
        // Track parentheses and brackets to handle multi-line expressions
        for (let char of trimmedLine) {
            if (char === '(') openParens++;
            else if (char === ')') openParens--;
            else if (char === '[') openBrackets++;
            else if (char === ']') openBrackets--;
        }
        
        currentStatement += (currentStatement ? '\n' : '') + line;
        
        // Check if this line starts a new statement (has assignment operator)
        if (!inStatement && trimmedLine.match(/^\w+\s*=/)) {
            inStatement = true;
            statementStartLine = i;
        }
        
        // Check if statement is complete
        if (trimmedLine.endsWith(';') || 
            (i === lines.length - 1) || // Last line
            (i < lines.length - 1 && lines[i + 1].trim().match(/^\w+\s*=/))) { // Next line starts new assignment
            
            // Statement is complete
            if (currentStatement.trim()) {
                statements.push({
                    text: currentStatement.trim(),
                    startLine: statementStartLine,
                    endLine: i,
                    hasSemicolon: trimmedLine.endsWith(';'),
                    isLastStatement: i === lines.length - 1 || (i < lines.length - 1 && !lines.slice(i + 1).some(l => l.trim()))
                });
            }
            currentStatement = '';
            inStatement = false;
            openParens = 0;
            openBrackets = 0;
        }
    }
    
    // Validate statements
    if (statements.length === 0) {
        // Single expression without assignment
        const hasSemicolon = contentWithoutComments.trim().endsWith(';');
        if (hasSemicolon) {
            errors.push({
                type: 'warning',
                message: 'Single expression (Alpha expression) should not end with a semicolon'
            });
        }
        
        // Check if single expression is a variable assignment
        const assignmentPattern = /^\s*\w+\s*=\s*[\s\S]*$/;
        if (assignmentPattern.test(contentWithoutComments)) {
            errors.push({
                type: 'error',
                message: 'The Alpha expression (final result) cannot be assigned to a variable. Remove the variable assignment.'
            });
        }
    } else if (statements.length === 1) {
        // Single statement
        if (statements[0].hasSemicolon && statements[0].isLastStatement) {
            errors.push({
                type: 'warning',
                message: 'The last statement (Alpha expression) should not end with a semicolon'
            });
        }
        
        // Check if single statement is a variable assignment
        const assignmentPattern = /^\s*\w+\s*=\s*[\s\S]*$/;
        if (assignmentPattern.test(statements[0].text)) {
            errors.push({
                type: 'error',
                message: 'The Alpha expression (final result) cannot be assigned to a variable. Remove the variable assignment.'
            });
        }
    } else {
        // Multiple statements
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (i < statements.length - 1 && !stmt.hasSemicolon) {
                // Not the last statement and missing semicolon
                errors.push({
                    type: 'error',
                    line: stmt.endLine + 1,
                    message: `Line ${stmt.endLine + 1}: Missing semicolon at the end of the statement`
                });
            } else if (i === statements.length - 1 && stmt.hasSemicolon) {
                // Last statement with semicolon
                errors.push({
                    type: 'warning',
                    line: stmt.endLine + 1,
                    message: `Line ${stmt.endLine + 1}: The last statement (Alpha expression) should not end with a semicolon`
                });
            }
            
            // Check if last statement is a variable assignment
            if (i === statements.length - 1) {
                const assignmentPattern = /^\s*\w+\s*=\s*[\s\S]*$/;
                if (assignmentPattern.test(stmt.text)) {
                    errors.push({
                        type: 'error',
                        line: stmt.endLine + 1,
                        message: `Line ${stmt.endLine + 1}: The Alpha expression (final result) cannot be assigned to a variable. Remove the variable assignment.`
                    });
                }
            }
        }
    }
    
    // Check for forbidden constructs
    const forbiddenPatterns = [
        { pattern: /\bclass\s+\w+/, message: 'Classes are not allowed in this expression language' },
        { pattern: /\bfunction\s+\w+/, message: 'Functions are not allowed in this expression language' },
        { pattern: /\w+\s*\*\s*\w+/, message: 'Pointers are not allowed in this expression language' },
        { pattern: /\bnew\s+\w+/, message: 'Object creation (new) is not allowed in this expression language' }
    ];
    
    forbiddenPatterns.forEach(({ pattern, message }) => {
        const matches = content.match(pattern);
        if (matches) {
            errors.push({
                type: 'error',
                message: message
            });
        }
    });
    
    // Display errors or success message
    if (errors.length === 0) {
        errorsDiv.innerHTML = '<div class="success-message">✓ Grammar check passed! No errors found.</div>';
    } else {
        errors.forEach(error => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-item';
            errorDiv.innerHTML = `<strong>${error.type.toUpperCase()}:</strong> ${error.message}`;
            errorsDiv.appendChild(errorDiv);
        });
    }
}

// Update template count display
function updateTemplateCount(templateName) {
    const template = templates.get(templateName);
    if (template && template.element) {
        const countSpan = template.element.querySelector('.template-count');
        if (countSpan) {
            if (template.variables && template.variables.length > 0) {
                countSpan.textContent = ` (${template.variables.length})`;
                countSpan.style.color = '#48bb78';
                countSpan.style.fontWeight = '600';
            } else {
                countSpan.textContent = '';
            }
        }
    }
}

// Detect templates in the expression
function detectTemplates() {
    const editor = document.getElementById('expressionEditor');
    const content = editor.value;
    const templateList = document.getElementById('templateList');
    
    // Store existing template configurations
    const existingTemplates = new Map(templates);
    
    // Clear previous templates
    templateList.innerHTML = '';
    templates.clear();
    
    // Regular expression to match templates like <variable_name/>
    const templateRegex = /<(\w+)\/>/g;
    const matches = [...content.matchAll(templateRegex)];
    
    // Get unique templates
    const uniqueTemplates = [...new Set(matches.map(match => match[1]))];
    
    if (uniqueTemplates.length === 0) {
        templateList.innerHTML = '<p style="color: #999; font-style: italic;">No templates detected</p>';
        return;
    }
    
    // Display each template
    uniqueTemplates.forEach(templateName => {
        const templateDiv = document.createElement('div');
        templateDiv.className = 'template-item not-configured';  // Add default not-configured class
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'template-name';
        nameSpan.innerHTML = `<span class="template-brackets">&lt;</span><span class="template-tag">${templateName}</span><span class="template-brackets">/&gt;</span><span class="template-count"></span>`;
        nameSpan.onclick = () => showTemplateConfig(templateName);
        nameSpan.title = 'Click to view current configuration';
        
        // Create container for the three buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'template-buttons';
        
        // Create Op button
        const opBtn = document.createElement('button');
        opBtn.className = 'btn btn-primary btn-small';
        opBtn.textContent = 'Op';
        opBtn.onclick = () => openTemplateModal(templateName, 'operator');
        
        // Create Data button
        const dataBtn = document.createElement('button');
        dataBtn.className = 'btn btn-secondary btn-small';
        dataBtn.textContent = 'DataField';
        dataBtn.onclick = () => openTemplateModal(templateName, 'data');
        
        // Create Normal button
        const normalBtn = document.createElement('button');
        normalBtn.className = 'btn btn-outline btn-small';
        normalBtn.textContent = 'Other';
        normalBtn.onclick = () => openTemplateModal(templateName, 'normal');
        
        buttonContainer.appendChild(opBtn);
        buttonContainer.appendChild(dataBtn);
        buttonContainer.appendChild(normalBtn);
        
        templateDiv.appendChild(nameSpan);
        templateDiv.appendChild(buttonContainer);
        templateList.appendChild(templateDiv);
        
        // Store template info - restore existing config if available
        const existingTemplate = existingTemplates.get(templateName);
        if (existingTemplate && existingTemplate.variables.length > 0) {
            templates.set(templateName, {
                name: templateName,
                variables: existingTemplate.variables,
                element: templateDiv,
                configType: existingTemplate.configType
            });
            // Update visual state
            templateDiv.className = 'template-item configured';
            updateTemplateCount(templateName);
        } else {
            templates.set(templateName, {
                name: templateName,
                variables: [],
                element: templateDiv,
                configType: null
            });
        }
    });
}

// Open modal for template configuration
function openTemplateModal(templateName, configType) {
    currentTemplate = templateName;
    currentConfigType = configType;  // Store the configuration type
    const modal = document.getElementById('templateModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const variableInput = document.getElementById('variableInput');
    const brainChooseSection = document.getElementById('brainChooseSection');
    
    // Update modal content based on configuration type
    let typeDescription = '';
    switch(configType) {
        case 'operator':
            typeDescription = 'operators';
            break;
        case 'data':
            typeDescription = 'data fields';
            break;
        case 'normal':
            typeDescription = 'normal parameters (like dates, etc.)';
            break;
    }
    
    modalTitle.textContent = `Configure Template: <${templateName}/> - ${configType.charAt(0).toUpperCase() + configType.slice(1)}`;
    modalDescription.textContent = `Enter a comma-separated list of ${typeDescription} for the ${templateName} template:`;
    
    // Show "Choose from BRAIN" button for operators and data fields if connected to BRAIN
    if ((configType === 'operator' || configType === 'data') && window.brainAPI && window.brainAPI.isConnectedToBrain()) {
        brainChooseSection.style.display = 'block';
        const chooseBrainBtn = document.getElementById('chooseBrainBtn');
        if (configType === 'operator') {
            chooseBrainBtn.textContent = 'Choose Operators from BRAIN';
            chooseBrainBtn.onclick = openBrainOperatorsModal;
        } else if (configType === 'data') {
            chooseBrainBtn.textContent = 'Choose Data Fields from BRAIN';
            chooseBrainBtn.onclick = openBrainDataFieldsModal;
        }
    } else {
        brainChooseSection.style.display = 'none';
    }
    
    // Load existing variables if any
    const template = templates.get(templateName);
    if (template && template.variables.length > 0 && template.configType === configType) {
        variableInput.value = template.variables.join(', ');
    } else {
        variableInput.value = '';
    }
    
    modal.style.display = 'block';
    variableInput.focus();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('templateModal');
    modal.style.display = 'none';
    currentTemplate = null;
}

// Show current template configuration
function showTemplateConfig(templateName) {
    const template = templates.get(templateName);
    const modal = document.getElementById('configInfoModal');
    const title = document.getElementById('configInfoTitle');
    const content = document.getElementById('configInfoContent');
    
    title.textContent = `Template: <${templateName}/>`;
    
    if (!template || !template.variables || template.variables.length === 0) {
        content.innerHTML = `
            <div class="config-info-item">
                <strong>Status:</strong> <span class="config-status-unconfigured">Not configured</span><br>
                <strong>Template:</strong> &lt;${templateName}/&gt;<br><br>
                <em>Click one of the configuration buttons (Op, Data, Normal) to set up this template.</em>
            </div>
        `;
    } else {
        const configTypeDisplay = template.configType ? 
            template.configType.charAt(0).toUpperCase() + template.configType.slice(1) : 
            'Unknown';
        
        content.innerHTML = `
            <div class="config-info-item">
                <strong>Status:</strong> <span class="config-status-configured">Configured</span><br>
                <strong>Template:</strong> &lt;${templateName}/&gt;<br>
                <strong>Type:</strong> ${configTypeDisplay}<br>
                <strong>Count:</strong> ${template.variables.length} value${template.variables.length > 1 ? 's' : ''}<br>
                <div class="config-info-values">
                    <strong>Values:</strong><br>
                    ${template.variables.join(', ')}
                </div>
            </div>
        `;
    }
    
    modal.style.display = 'block';
}

// Close configuration info modal
function closeConfigInfoModal() {
    const modal = document.getElementById('configInfoModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const templateModal = document.getElementById('templateModal');
    const configInfoModal = document.getElementById('configInfoModal');
    const brainLoginModal = document.getElementById('brainLoginModal');
    const brainOperatorsModal = document.getElementById('brainOperatorsModal');
    const brainDataFieldsModal = document.getElementById('brainDataFieldsModal');
    const settingsModal = document.getElementById('settingsModal');
    const saveTemplateModal = document.getElementById('saveTemplateModal');
    const overwriteTemplateModal = document.getElementById('overwriteTemplateModal');
    
    if (event.target === templateModal) {
        closeModal();
    } else if (event.target === configInfoModal) {
        closeConfigInfoModal();
    } else if (event.target === brainLoginModal) {
        // Check if login is in progress
        const loginBtn = document.getElementById('loginBtn');
        if (!loginBtn || !loginBtn.disabled) {
            closeBrainLoginModal();
        }
    } else if (event.target === brainOperatorsModal) {
        closeBrainOperatorsModal();
    } else if (event.target === brainDataFieldsModal) {
        closeBrainDataFieldsModal();
    } else if (event.target === settingsModal) {
        closeSettingsModal();
    } else if (event.target === saveTemplateModal) {
        closeSaveTemplateModal();
    } else if (event.target === overwriteTemplateModal) {
        closeOverwriteTemplateModal();
    }
}

// Apply template variables
function applyTemplate() {
    const variableInput = document.getElementById('variableInput');
    
    // Special handling for bucket() functions to avoid splitting on commas inside them
    const variables = parseVariablesWithBucketSupport(variableInput.value);
    
    if (variables.length === 0) {
        alert('Please enter at least one variable');
        return;
    }
    
    // Store variables for the template
    const template = templates.get(currentTemplate);
    if (template) {
        template.variables = variables;
        template.configType = currentConfigType;  // Store the configuration type
        // Update the visual indicator
        if (template.element) {
            template.element.className = 'template-item configured';
        }
        // Update the count display
        updateTemplateCount(currentTemplate);
    }
    
    // Close the modal
    closeModal();
    
    // Show success message
    const errorsDiv = document.getElementById('grammarErrors');
    errorsDiv.innerHTML = `<div class="success-message">✓ Template <${currentTemplate}/> configured as ${currentConfigType} with ${variables.length} variable${variables.length > 1 ? 's' : ''}</div>`;
}

// Parse variables with special support for bucket() functions
function parseVariablesWithBucketSupport(input) {
    const variables = [];
    let currentVariable = '';
    let i = 0;
    
    while (i < input.length) {
        const char = input[i];
        
        // Check if we're starting a bucket function
        if (char === 'b' && i + 7 <= input.length && input.substring(i, i + 7) === 'bucket(') {
            // Add any previous variable before the bucket function
            const trimmed = currentVariable.trim();
            if (trimmed !== '') {
                variables.push(trimmed);
            }
            
            // Find the complete bucket function
            const bucketFunction = extractBucketFunction(input, i);
            if (bucketFunction) {
                // Add the complete bucket function
                variables.push(bucketFunction.function);
                currentVariable = '';
                i = bucketFunction.endIndex + 1; // Move past the bucket function
                continue;
            } else {
                currentVariable += char;
            }
        }
        
        // Regular comma handling
        if (char === ',') {
            const trimmed = currentVariable.trim();
            if (trimmed !== '') {
                variables.push(trimmed);
            }
            currentVariable = '';
        } else {
            currentVariable += char;
        }
        
        i++;
    }
    
    // Add the last variable if there is one
    const trimmed = currentVariable.trim();
    if (trimmed !== '') {
        variables.push(trimmed);
    }
    
    return variables;
}

// Extract complete bucket function including all nested content
function extractBucketFunction(input, startIndex) {
    let parenthesesCount = 0;
    let inQuotes = false;
    let quoteChar = null;
    let i = startIndex;
    
    // Find the start of bucket(
    if (input.substring(i, i + 7) !== 'bucket(') {
        return null;
    }
    
    parenthesesCount = 1;
    i += 7; // Move past "bucket("
    
    while (i < input.length) {
        const char = input[i];
        
        // Handle quotes
        if ((char === '"' || char === "'") && !inQuotes) {
            inQuotes = true;
            quoteChar = char;
        } else if (char === quoteChar && inQuotes) {
            inQuotes = false;
            quoteChar = null;
        }
        
        // Only count parentheses when not inside quotes
        if (!inQuotes) {
            if (char === '(') {
                parenthesesCount++;
            } else if (char === ')') {
                parenthesesCount--;
                if (parenthesesCount === 0) {
                    // Found the end of bucket function
                    const functionText = input.substring(startIndex, i + 1);
                    return {
                        function: functionText,
                        endIndex: i
                    };
                }
            }
        }
        
        i++;
    }
    
    return null; // No matching closing parenthesis found
}

// Clear editor
function clearEditor() {
    const editor = document.getElementById('expressionEditor');
    editor.value = '';
    updateLineNumbers();
    updateSyntaxHighlight();
    document.getElementById('grammarErrors').innerHTML = '';
    document.getElementById('decodedResults').style.display = 'none';
    detectTemplates();
}

// Auto-completion functionality
let autoCompleteActive = false;
let autoCompletePosition = null;
let shadowSuggestion = null;

function handleAutoComplete(event) {
    const editor = event.target;
    const cursorPos = editor.selectionStart;
    const text = editor.value;
    const lastChar = text[cursorPos - 1];
    const prevChar = cursorPos > 1 ? text[cursorPos - 2] : '';
    
    // If user typed '<', show shadow suggestion
    if (lastChar === '<' && event.inputType === 'insertText') {
        // Show shadow suggestion for template
        showShadowSuggestion(editor, cursorPos, 'variable_name/>');
        autoCompleteActive = true;
        autoCompletePosition = cursorPos;
    }
    // If user typed '/', check if it's after '<'
    else if (lastChar === '/' && prevChar === '<') {
        // Auto-complete the closing '>'
        const before = text.substring(0, cursorPos);
        const after = text.substring(cursorPos);
        editor.value = before + '>' + after;
        editor.setSelectionRange(cursorPos, cursorPos);
        
        // Update shadow to show between < and />
        hideShadowSuggestion();
        autoCompleteActive = false;
    }
    // If user typed something after '<' that's not '/', hide suggestion
    else if (prevChar === '<' && lastChar !== '/' && autoCompleteActive) {
        // User is typing something else after '<', like a comparison
        hideShadowSuggestion();
        autoCompleteActive = false;
    }
    else {
        // Check if we should hide suggestion for other cases
        if (!autoCompleteActive || (autoCompletePosition && cursorPos > autoCompletePosition + 1)) {
            hideShadowSuggestion();
            autoCompleteActive = false;
        }
    }
}

function handleTabCompletion() {
    const editor = document.getElementById('expressionEditor');
    const cursorPos = editor.selectionStart;
    const text = editor.value;
    
    if (autoCompleteActive && shadowSuggestion) {
        // Check if we're right after '<'
        if (cursorPos > 0 && text[cursorPos - 1] === '<') {
            // Complete the template
            const before = text.substring(0, cursorPos);
            const after = text.substring(cursorPos);
            editor.value = before + '/>' + after;
            editor.setSelectionRange(cursorPos, cursorPos);
            
            hideShadowSuggestion();
            autoCompleteActive = false;
            
            // Trigger input event to update everything
            const inputEvent = new Event('input', { bubbles: true });
            editor.dispatchEvent(inputEvent);
            
            // Update syntax highlighting immediately
            updateSyntaxHighlight();
        }
    }
}

function showShadowSuggestion(editor, position, suggestion) {
    // Remove any existing shadow
    hideShadowSuggestion();
    
    // Create shadow element
    shadowSuggestion = document.createElement('div');
    shadowSuggestion.className = 'shadow-suggestion';
    shadowSuggestion.textContent = suggestion;
    
    // Get editor wrapper for relative positioning
    const editorWrapper = editor.closest('.editor-wrapper');
    const editorRect = editor.getBoundingClientRect();
    
    // Calculate position based on character position
    const lineHeight = parseInt(window.getComputedStyle(editor).lineHeight);
    const lines = editor.value.substring(0, position).split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length;
    
    // Approximate character width (monospace font)
    const charWidth = 9.6; // Approximate width for 16px monospace font
    
    // Position shadow relative to editor
    shadowSuggestion.style.position = 'fixed';
    shadowSuggestion.style.left = (editorRect.left + 15 + (currentCol * charWidth)) + 'px';
    shadowSuggestion.style.top = (editorRect.top + 12 + ((currentLine - 1) * lineHeight) - editor.scrollTop) + 'px';
    shadowSuggestion.style.pointerEvents = 'none';
    shadowSuggestion.style.zIndex = '1000';
    
    // Add hint text below
    const hintText = document.createElement('div');
    hintText.className = 'shadow-hint';
    hintText.textContent = 'Tab to complete template';
    shadowSuggestion.appendChild(hintText);
    
    document.body.appendChild(shadowSuggestion);
}

function hideShadowSuggestion() {
    if (shadowSuggestion) {
        shadowSuggestion.remove();
        shadowSuggestion = null;
    }
}

// BRAIN Operators Modal Functions
let selectedOperators = new Set();

function openBrainOperatorsModal() {
    const modal = document.getElementById('brainOperatorsModal');
    selectedOperators.clear();
    
    // Populate categories
    populateOperatorCategories();
    
    // Populate operators list
    populateOperatorsList();
    
    // Set up event listeners
    setupOperatorsModalEventListeners();
    
    modal.style.display = 'block';
}

function closeBrainOperatorsModal() {
    const modal = document.getElementById('brainOperatorsModal');
    modal.style.display = 'none';
    selectedOperators.clear();
    updateSelectedOperatorsDisplay();
}

function populateOperatorCategories() {
    const categoryFilter = document.getElementById('categoryFilter');
    const operators = window.brainAPI ? window.brainAPI.getLoadedOperators() : [];
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    
    // Get unique categories
    const categories = [...new Set(operators.map(op => op.category))].sort();
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function populateOperatorsList(searchTerm = '', categoryFilter = '') {
    const operatorsList = document.getElementById('operatorsList');
    const operators = window.brainAPI ? window.brainAPI.getLoadedOperators() : [];
    
    // Filter operators
    let filteredOperators = operators;
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredOperators = filteredOperators.filter(op => 
            op.name.toLowerCase().includes(term) || 
            op.category.toLowerCase().includes(term)
        );
    }
    
    if (categoryFilter) {
        filteredOperators = filteredOperators.filter(op => op.category === categoryFilter);
    }
    
    // Clear list
    operatorsList.innerHTML = '';
    
    if (filteredOperators.length === 0) {
        operatorsList.innerHTML = '<p style="text-align: center; color: #666;">No operators found</p>';
        return;
    }
    
    // Create operator items
    filteredOperators.forEach(operator => {
        const item = document.createElement('div');
        item.className = 'operator-item';
        item.dataset.operatorName = operator.name;
        
        // Build tooltip content if description or definition is available
        let tooltipContent = '';
        if (operator.description) {
            tooltipContent += `Description: ${operator.description}`;
        }
        if (operator.definition) {
            tooltipContent += tooltipContent ? `\n\nDefinition: ${operator.definition}` : `Definition: ${operator.definition}`;
        }
        if (operator.example) {
            tooltipContent += tooltipContent ? `\n\nExample: ${operator.example}` : `Example: ${operator.example}`;
        }
        if (operator.usageCount !== undefined) {
            tooltipContent += tooltipContent ? `\n\nUsage Count: ${operator.usageCount}` : `Usage Count: ${operator.usageCount}`;
        }
        
        // Add custom tooltip if we have content
        if (tooltipContent) {
            item.dataset.tooltip = tooltipContent;
            item.style.cursor = 'help';
            
            // Add mouse event listeners for custom tooltip
            item.addEventListener('mouseenter', showCustomTooltip);
            item.addEventListener('mouseleave', hideCustomTooltip);
            item.addEventListener('mousemove', moveCustomTooltip);
        }
        
        // Create description indicator if description or definition is available
        const descriptionIndicator = (operator.description || operator.definition) ? 
            '<span class="description-indicator" title="Has description/definition">📖</span>' : '';
        
        item.innerHTML = `
            <input type="checkbox" class="operator-checkbox" ${selectedOperators.has(operator.name) ? 'checked' : ''}>
            <div class="operator-info">
                <span class="operator-name">${operator.name} ${descriptionIndicator}</span>
                <span class="operator-category">${operator.category}</span>
            </div>
        `;
        
        item.onclick = () => toggleOperatorSelection(operator.name, item);
        operatorsList.appendChild(item);
    });
}

function toggleOperatorSelection(operatorName, item) {
    const checkbox = item.querySelector('.operator-checkbox');
    
    if (selectedOperators.has(operatorName)) {
        selectedOperators.delete(operatorName);
        checkbox.checked = false;
        item.classList.remove('selected');
    } else {
        selectedOperators.add(operatorName);
        checkbox.checked = true;
        item.classList.add('selected');
    }
    
    updateSelectedOperatorsDisplay();
}

function updateSelectedOperatorsDisplay() {
    const selectedContainer = document.getElementById('selectedOperators');
    
    selectedContainer.innerHTML = '';
    
    if (selectedOperators.size === 0) {
        selectedContainer.innerHTML = '<em style="color: #666;">No operators selected</em>';
        return;
    }
    
    selectedOperators.forEach(operatorName => {
        const item = document.createElement('span');
        item.className = 'selected-item';
        item.innerHTML = `
            ${operatorName}
            <button class="remove-btn" onclick="removeSelectedOperator('${operatorName}')">&times;</button>
        `;
        selectedContainer.appendChild(item);
    });
}

function removeSelectedOperator(operatorName) {
    selectedOperators.delete(operatorName);
    updateSelectedOperatorsDisplay();
    
    // Update the checkbox in the list
    const operatorItem = document.querySelector(`[data-operator-name="${operatorName}"]`);
    if (operatorItem) {
        const checkbox = operatorItem.querySelector('.operator-checkbox');
        checkbox.checked = false;
        operatorItem.classList.remove('selected');
    }
}

function setupOperatorsModalEventListeners() {
    const searchInput = document.getElementById('operatorSearch');
    const categoryFilter = document.getElementById('categoryFilter');
    const selectAllBtn = document.getElementById('selectAllFilteredOperators');
    const clearAllBtn = document.getElementById('clearAllOperators');
    
    searchInput.oninput = () => {
        populateOperatorsList(searchInput.value, categoryFilter.value);
    };
    
    categoryFilter.onchange = () => {
        populateOperatorsList(searchInput.value, categoryFilter.value);
    };
    
    selectAllBtn.onclick = selectAllFilteredOperators;
    clearAllBtn.onclick = clearAllOperators;
}

function selectAllFilteredOperators() {
    const operatorItems = document.querySelectorAll('.operator-item');
    operatorItems.forEach(item => {
        const operatorName = item.dataset.operatorName;
        if (!selectedOperators.has(operatorName)) {
            selectedOperators.add(operatorName);
            const checkbox = item.querySelector('.operator-checkbox');
            checkbox.checked = true;
            item.classList.add('selected');
        }
    });
    updateSelectedOperatorsDisplay();
}

function clearAllOperators() {
    selectedOperators.clear();
    
    // Update all checkboxes
    document.querySelectorAll('.operator-item').forEach(item => {
        const checkbox = item.querySelector('.operator-checkbox');
        checkbox.checked = false;
        item.classList.remove('selected');
    });
    
    updateSelectedOperatorsDisplay();
}

function applySelectedOperators() {
    if (selectedOperators.size === 0) {
        alert('Please select at least one operator');
        return;
    }
    
    // Add selected operators to the variable input
    const variableInput = document.getElementById('variableInput');
    const currentValues = variableInput.value.trim();
    const newValues = Array.from(selectedOperators);
    
    if (currentValues) {
        variableInput.value = currentValues + ', ' + newValues.join(', ');
    } else {
        variableInput.value = newValues.join(', ');
    }
    
    closeBrainOperatorsModal();
}

// BRAIN Data Fields Modal Functions
let selectedDataFields = new Set();
let currentDataFields = [];
let filteredDataFields = [];
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

function openBrainDataFieldsModal() {
    const modal = document.getElementById('brainDataFieldsModal');
    selectedDataFields.clear();
    currentDataFields = [];
    filteredDataFields = [];
    
    // Reset column filters
    columnFilters = {
        id: '',
        description: '',
        type: '',
        coverage: { min: null, max: null },
        userCount: null,
        alphaCount: null
    };
    sortColumn = null;
    sortOrder = 'asc';
    
    // Reset UI state
    document.getElementById('dataFieldsContent').style.display = 'none';
    document.getElementById('dataFieldsLoading').style.display = 'none';
    
    // Clear column filter inputs
    document.querySelectorAll('.column-filter').forEach(filter => {
        filter.value = '';
    });
    document.querySelectorAll('.column-filter-min, .column-filter-max').forEach(filter => {
        filter.value = '';
    });
    
    // Reset sort buttons
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.classList.remove('asc', 'desc');
        btn.dataset.order = 'asc';
    });
    
    // Set up event listeners
    setupDataFieldsModalEventListeners();
    
    modal.style.display = 'block';
}

function closeBrainDataFieldsModal() {
    const modal = document.getElementById('brainDataFieldsModal');
    modal.style.display = 'none';
    selectedDataFields.clear();
    updateSelectedDataFieldsDisplay();
}

async function loadDataFields() {
    const region = document.getElementById('regionInput').value;
    const delay = document.getElementById('delayInput').value;
    const universe = document.getElementById('universeInput').value;
    const datasetId = document.getElementById('datasetInput').value;
    
    const loadingDiv = document.getElementById('dataFieldsLoading');
    const contentDiv = document.getElementById('dataFieldsContent');
    
    try {
        loadingDiv.style.display = 'block';
        contentDiv.style.display = 'none';
        
        // Fetch data fields using the brain API
        if (!window.brainAPI || !window.brainAPI.isConnectedToBrain()) {
            throw new Error('Not connected to BRAIN');
        }
        
        const dataFields = await window.brainAPI.getDataFields(region, parseInt(delay), universe, datasetId);
        currentDataFields = dataFields;
        filteredDataFields = [...dataFields];
        
        populateDataFieldsList();
        updateDataFieldsStats();
        populateTypeFilter();
        
        loadingDiv.style.display = 'none';
        contentDiv.style.display = 'block';
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        alert(`Failed to load data fields: ${error.message}`);
    }
}

function populateDataFieldsList() {
    const tableBody = document.getElementById('dataFieldsTableBody');
    const highCoverageFilter = document.getElementById('filterHighCoverage').checked;
    const popularFilter = document.getElementById('filterPopular').checked;
    const matrixOnlyFilter = document.getElementById('filterMatrixOnly').checked;
    
    // Apply filters
    filteredDataFields = currentDataFields.filter(field => {
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
        if (selectedDataFields.has(field.id)) {
            row.classList.add('selected');
        }
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="data-field-checkbox" ${selectedDataFields.has(field.id) ? 'checked' : ''}>
            </td>
            <td><span class="data-field-id">${field.id}</span></td>
            <td><span class="data-field-description">${field.description}</span></td>
            <td><span class="data-field-type">${field.type}</span></td>
            <td><span class="data-field-coverage">${(field.coverage * 100).toFixed(1)}%</span></td>
            <td><span class="data-field-count">${field.userCount.toLocaleString()}</span></td>
            <td><span class="data-field-count">${field.alphaCount.toLocaleString()}</span></td>
        `;
        
        row.onclick = (e) => {
            if (e.target.type !== 'checkbox') {
                toggleDataFieldSelection(field.id, row);
            }
        };
        
        const checkbox = row.querySelector('.data-field-checkbox');
        checkbox.onclick = (e) => {
            e.stopPropagation();
            toggleDataFieldSelection(field.id, row);
        };
        
        tableBody.appendChild(row);
    });
    
    updateDataFieldsStats();
}

function toggleDataFieldSelection(fieldId, row) {
    const checkbox = row.querySelector('.data-field-checkbox');
    
    if (selectedDataFields.has(fieldId)) {
        selectedDataFields.delete(fieldId);
        checkbox.checked = false;
        row.classList.remove('selected');
    } else {
        selectedDataFields.add(fieldId);
        checkbox.checked = true;
        row.classList.add('selected');
    }
    
    updateSelectedDataFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

function updateSelectedDataFieldsDisplay() {
    const selectedContainer = document.getElementById('selectedDataFields');
    
    selectedContainer.innerHTML = '';
    
    if (selectedDataFields.size === 0) {
        selectedContainer.innerHTML = '<em style="color: #666;">No data fields selected</em>';
        return;
    }
    
    selectedDataFields.forEach(fieldId => {
        const item = document.createElement('span');
        item.className = 'selected-item';
        item.innerHTML = `
            ${fieldId}
            <button class="remove-btn" onclick="removeSelectedDataField('${fieldId}')">&times;</button>
        `;
        selectedContainer.appendChild(item);
    });
}

function removeSelectedDataField(fieldId) {
    selectedDataFields.delete(fieldId);
    updateSelectedDataFieldsDisplay();
    updateDataFieldsStats();
    
    // Update the checkbox in the table
    const row = document.querySelector(`tr[data-field-id="${fieldId}"]`);
    if (row) {
        const checkbox = row.querySelector('.data-field-checkbox');
        checkbox.checked = false;
        row.classList.remove('selected');
    }
    
    updateSelectAllCheckbox();
}

function updateDataFieldsStats() {
    document.getElementById('dataFieldsCount').textContent = `${currentDataFields.length} fields loaded`;
    document.getElementById('filteredCount').textContent = `${filteredDataFields.length} filtered`;
    document.getElementById('selectedCount').textContent = `${selectedDataFields.size} selected`;
}

function populateTypeFilter() {
    const typeFilter = document.getElementById('typeFilter');
    if (!typeFilter) return;
    
    // Get unique types from current data fields
    const uniqueTypes = [...new Set(currentDataFields.map(field => field.type))].sort();
    
    // Clear existing options except "All Types"
    typeFilter.innerHTML = '<option value="">All Types</option>';
    
    // Add unique types as options
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

function selectAllFilteredDataFields() {
    filteredDataFields.forEach(field => {
        selectedDataFields.add(field.id);
        const row = document.querySelector(`tr[data-field-id="${field.id}"]`);
        if (row) {
            const checkbox = row.querySelector('.data-field-checkbox');
            checkbox.checked = true;
            row.classList.add('selected');
        }
    });
    
    updateSelectedDataFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

function clearAllSelectedDataFields() {
    selectedDataFields.clear();
    
    // Update all checkboxes
    document.querySelectorAll('.data-field-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('tr').classList.remove('selected');
    });
    
    updateSelectedDataFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

function setupDataFieldsModalEventListeners() {
    const loadBtn = document.getElementById('loadDataFieldsBtn');
    const selectAllBtn = document.getElementById('selectAllFiltered');
    const clearAllBtn = document.getElementById('clearAllSelected');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    // Filter checkboxes
    const highCoverageFilter = document.getElementById('filterHighCoverage');
    const popularFilter = document.getElementById('filterPopular');
    const matrixOnlyFilter = document.getElementById('filterMatrixOnly');
    
    loadBtn.onclick = loadDataFields;
    
    // Filter checkbox listeners
    highCoverageFilter.onchange = () => populateDataFieldsList();
    popularFilter.onchange = () => populateDataFieldsList();
    matrixOnlyFilter.onchange = () => populateDataFieldsList();
    
    selectAllBtn.onclick = selectAllFilteredDataFields;
    clearAllBtn.onclick = clearAllSelectedDataFields;
    
    selectAllCheckbox.onclick = (e) => {
        e.stopPropagation();
        if (selectAllCheckbox.checked) {
            selectAllFilteredDataFields();
        } else {
            clearAllFilteredDataFields();
        }
    };
    
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
            
            populateDataFieldsList();
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
            
            populateDataFieldsList();
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
            
            populateDataFieldsList();
        });
    });
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (!selectAllCheckbox) return;
    
    const allFilteredSelected = filteredDataFields.length > 0 && 
        filteredDataFields.every(field => selectedDataFields.has(field.id));
    
    selectAllCheckbox.checked = allFilteredSelected;
    selectAllCheckbox.indeterminate = !allFilteredSelected && 
        filteredDataFields.some(field => selectedDataFields.has(field.id));
}

function clearAllFilteredDataFields() {
    filteredDataFields.forEach(field => {
        selectedDataFields.delete(field.id);
        const row = document.querySelector(`tr[data-field-id="${field.id}"]`);
        if (row) {
            const checkbox = row.querySelector('.data-field-checkbox');
            checkbox.checked = false;
            row.classList.remove('selected');
        }
    });
    
    updateSelectedDataFieldsDisplay();
    updateDataFieldsStats();
    updateSelectAllCheckbox();
}

function applySelectedDataFields() {
    if (selectedDataFields.size === 0) {
        alert('Please select at least one data field');
        return;
    }
    
    // Add selected data fields to the variable input
    const variableInput = document.getElementById('variableInput');
    const currentValues = variableInput.value.trim();
    const newValues = Array.from(selectedDataFields);
    
    if (currentValues) {
        variableInput.value = currentValues + ', ' + newValues.join(', ');
    } else {
        variableInput.value = newValues.join(', ');
    }
    
    closeBrainDataFieldsModal();
}

// Custom tooltip functionality
let tooltipElement = null;

function createTooltipElement() {
    if (!tooltipElement) {
        tooltipElement = document.createElement('div');
        tooltipElement.className = 'custom-tooltip';
        document.body.appendChild(tooltipElement);
    }
    return tooltipElement;
}

function showCustomTooltip(event) {
    const tooltip = createTooltipElement();
    const content = event.target.closest('[data-tooltip]')?.dataset.tooltip;
    
    if (content) {
        tooltip.textContent = content;
        tooltip.style.opacity = '1';
        moveCustomTooltip(event);
    }
}

function hideCustomTooltip() {
    if (tooltipElement) {
        tooltipElement.style.opacity = '0';
    }
}

function moveCustomTooltip(event) {
    if (!tooltipElement || tooltipElement.style.opacity === '0') return;
    
    const tooltip = tooltipElement;
    const mouseX = event.clientX;
    const mouseY = event.clientY;
    const offset = 10;
    
    // Get tooltip dimensions
    const tooltipRect = tooltip.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Calculate position
    let left = mouseX + offset;
    let top = mouseY + offset;
    
    // Adjust if tooltip would go off-screen to the right
    if (left + tooltipRect.width > windowWidth) {
        left = mouseX - tooltipRect.width - offset;
    }
    
    // Adjust if tooltip would go off-screen at the bottom
    if (top + tooltipRect.height > windowHeight) {
        top = mouseY - tooltipRect.height - offset;
    }
    
    // Ensure tooltip doesn't go off-screen to the left or top
    if (left < 0) left = offset;
    if (top < 0) top = offset;
    
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
} 