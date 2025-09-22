// Feature Engineering JavaScript

// Store API key and state in session storage
let apiKey = sessionStorage.getItem('deepseekApiKey');
let modelProvider = sessionStorage.getItem('featureEngProvider') || 'deepseek';
let modelName = sessionStorage.getItem('featureEngModelName') || 'deepseek-chat';
let currentStep = parseInt(sessionStorage.getItem('featureEngCurrentStep')) || 1;
let pipelineSteps = JSON.parse(sessionStorage.getItem('featureEngPipelineSteps')) || [];
let currentOptions = JSON.parse(sessionStorage.getItem('featureEngCurrentOptions')) || [];
let currentDataState = sessionStorage.getItem('featureEngCurrentDataState') || 'raw data';
let conversationHistory = JSON.parse(sessionStorage.getItem('featureEngConversationHistory')) || [];
let customSystemPrompt = sessionStorage.getItem('customSystemPrompt') || null;

// DOM Elements
const modelProviderSelect = document.getElementById('modelProvider');
const apiKeyInput = document.getElementById('apiKey');
const modelNameInput = document.getElementById('modelName');
const saveApiKeyBtn = document.getElementById('saveApiKey');
const apiConfigSection = document.getElementById('apiConfigSection');
const showApiConfigSection = document.getElementById('showApiConfigSection');
const showApiConfigBtn = document.getElementById('showApiConfig');
const loadQuestionTemplateBtn = document.getElementById('loadQuestionTemplate');
const editSystemPromptBtn = document.getElementById('editSystemPrompt');
const questionTemplateInput = document.getElementById('questionTemplate');
const startPipelineBtn = document.getElementById('startPipeline');
const systemPromptModal = document.getElementById('systemPromptModal');
const systemPromptTextarea = document.getElementById('systemPromptTextarea');
const loadDefaultPromptBtn = document.getElementById('loadDefaultPrompt');
const initialSetupSection = document.getElementById('initialSetup');
const optionsSection = document.getElementById('optionsSection');
const optionsContainer = document.getElementById('optionsContainer');
const clearOptionsBtn = document.getElementById('clearOptions');
const exportPipelineBtn = document.getElementById('exportPipeline');
const pipelineStatus = document.getElementById('pipelineStatus');
const pipelineStepsDiv = document.getElementById('pipelineSteps');
const modalOverlay = document.getElementById('modalOverlay');
const categoryPopup = document.getElementById('categoryPopup');
const categoryPopupTitle = document.getElementById('categoryPopupTitle');
const categoryPopupDescription = document.getElementById('categoryPopupDescription');
const categoryPopupOperators = document.getElementById('categoryPopupOperators');
const categoryPopupOperatorsTitle = document.getElementById('categoryPopupOperatorsTitle');

// Initialize API key if exists
if (apiKey) {
    apiKeyInput.value = apiKey;
}

// Initialize model provider and name
modelProviderSelect.value = modelProvider;
modelNameInput.value = modelName;

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
    sessionStorage.setItem('featureEngProvider', modelProvider);
    updateModelNamePlaceholder();
});

// Model name change handler
modelNameInput.addEventListener('input', () => {
    modelName = modelNameInput.value;
    sessionStorage.setItem('featureEngModelName', modelName);
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

// Load existing conversation state on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Loading conversation state...');
    console.log('Conversation history:', conversationHistory);
    console.log('Current step:', currentStep);
    console.log('Pipeline steps:', pipelineSteps);
    console.log('Current options:', currentOptions);
    
    // Check API config status
    checkApiConfigStatus();
    
    // If we have conversation history, display the current options
    if (conversationHistory.length > 0 && currentOptions.length > 0) {
        console.log('Restoring conversation state...');
        initialSetupSection.style.display = 'none';
        optionsSection.style.display = 'block';
        displayOptions();
        updatePipelineStatus();
    } else {
        // Ensure we start with a clean state
        console.log('Starting with clean state...');
        initialSetupSection.style.display = 'block';
        optionsSection.style.display = 'none';
    }
});

// Close modal when clicking overlay
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
        // Find the editing card and cancel edit
        const editingCard = document.querySelector('.option-card.editing');
        if (editingCard) {
            const index = parseInt(editingCard.dataset.optionIndex);
            cancelEdit(index);
        }
    }
});

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
        
        const response = await fetch('/feature-engineering/api/test-deepseek', {
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
            sessionStorage.setItem('featureEngProvider', newProvider);
            sessionStorage.setItem('featureEngModelName', newModelName);
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
        }
    } catch (error) {
        showNotification('Error testing API connection: ' + error.message, 'error');
        console.error('API Test Error:', error);
    } finally {
        hideLoading();
    }
});

// Load Question Template
loadQuestionTemplateBtn.addEventListener('click', () => {
    const template = `Current step: 0
Current datafield: modify_your_input
Current datafiled description: input_datafield_description
Initial EDA observation: input_datafield_eda_observation
Previous steps and categories used: None
Current data state: this is the first step raw data`;
    
    questionTemplateInput.value = template;
    showNotification('Question template loaded', 'success');
});

// Edit System Prompt
editSystemPromptBtn.addEventListener('click', () => {
    // Load current system prompt or default
    if (customSystemPrompt) {
        systemPromptTextarea.value = customSystemPrompt;
    } else {
        loadDefaultSystemPrompt();
    }
    systemPromptModal.style.display = 'block';
});

// Load Default System Prompt
loadDefaultPromptBtn.addEventListener('click', loadDefaultSystemPrompt);

// Hide category popup when clicking outside
document.addEventListener('click', (e) => {
    if (!categoryPopup.contains(e.target) && !e.target.classList.contains('clickable-category')) {
        hideCategoryPopup();
    }
});

async function loadDefaultSystemPrompt() {
    try {
        showLoading('Loading default system prompt...');
        
        const response = await fetch('/feature-engineering/api/get-default-system-prompt', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            systemPromptTextarea.value = data.default_system_prompt;
            showNotification('Default system prompt loaded from backend', 'success');
        } else {
            showNotification(`Error loading default prompt: ${data.error || 'Unknown error'}`, 'error');
            console.error('Error loading default prompt:', data);
        }
    } catch (error) {
        showNotification('Error loading default system prompt: ' + error.message, 'error');
        console.error('Error loading default prompt:', error);
    } finally {
        hideLoading();
    }
}

// Close System Prompt Modal
function closeSystemPromptModal() {
    systemPromptModal.style.display = 'none';
}

// Save System Prompt
function saveSystemPrompt() {
    const prompt = systemPromptTextarea.value.trim();
    if (!prompt) {
        showNotification('System prompt cannot be empty', 'error');
        return;
    }
    
    customSystemPrompt = prompt;
    sessionStorage.setItem('customSystemPrompt', prompt);
    systemPromptModal.style.display = 'none';
    showNotification('System prompt saved successfully', 'success');
}

// Start Feature Engineering Pipeline
startPipelineBtn.addEventListener('click', async () => {
    if (!apiKey) {
        showNotification('Please configure your Deepseek API key first', 'error');
        return;
    }

    const questionTemplate = questionTemplateInput.value.trim();

    if (!questionTemplate) {
        showNotification('Please load or enter a question template', 'error');
        return;
    }

    try {
        showLoading('Getting AI recommendations...');
        
        console.log('=== STARTING NEW PIPELINE ===');
        console.log('Current conversation history before start:', conversationHistory);
        console.log('Conversation history length:', conversationHistory.length);
        
        const response = await fetch('/feature-engineering/api/continue-conversation', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversation_history: [],
                user_message: questionTemplate,
                custom_system_prompt: customSystemPrompt,
                provider: modelProvider,
                model_name: modelName
            })
        });

        const data = await response.json();
        
        console.log('=== INITIAL PROMPT ===');
        console.log('User message:', questionTemplate);
        console.log('=== AI RESPONSE ===');
        console.log('AI response:', data.response);
        console.log('==================');
        
        if (response.ok && data.success) {
            // Clear conversation history and reset state for new pipeline
            conversationHistory = [];
            currentStep = 1;
            pipelineSteps = [];
            currentDataState = 'raw data';
            
            // Add to conversation history
            conversationHistory.push({
                role: 'user',
                content: questionTemplate
            });
            conversationHistory.push({
                role: 'assistant',
                content: data.response
            });
            
            console.log('Conversation history after initial:', conversationHistory);
            console.log('Conversation history length:', conversationHistory.length);
            
            // Parse the AI response to extract options
            parseAIResponse(data.response);
            
            // Save conversation state
            saveConversationState();
            
            // Show options section and hide initial setup
            initialSetupSection.style.display = 'none';
            optionsSection.style.display = 'block';
            updatePipelineStatus();
            
            showNotification('AI recommendations loaded successfully', 'success');
        } else {
            showNotification(`Error: ${data.error || 'Unknown error'}`, 'error');
            console.error('API Error Details:', data);
        }
    } catch (error) {
        showNotification('Error getting recommendations: ' + error.message, 'error');
        console.error('Pipeline Start Error:', error);
    } finally {
        hideLoading();
    }
});

// Parse AI Response to extract options
function parseAIResponse(response) {
    console.log('=== PARSING AI RESPONSE ===');
    console.log('Raw response:', response);
    
    currentOptions = [];
    
    // Dynamic content cleaning - remove various summary sections
    let cleanResponse = response;
    const summaryPatterns = [
        /### \*\*Best Choice\?\*\*[\s\S]*$/i,
        /### \*\*Recommended Next Step:\*\*[\s\S]*$/i,
        /Most recommended choice:[\s\S]*$/i,
        /Rationale:[\s\S]*$/i,
        /This maintains[\s\S]*$/i,
        /Would you like to proceed[\s\S]*$/i,
        /\*Example features to create:\*[\s\S]*$/i
    ];
    
    summaryPatterns.forEach(pattern => {
        cleanResponse = cleanResponse.replace(pattern, '');
    });
    
    console.log('Cleaned response:', cleanResponse);
    
    // Extract top-level context dynamically
    let globalContext = null;
    const contextPatterns = [
        /\*\*Context:\*\*\s*([\s\S]*?)(?=###|####|\*\*Option|\*\*Choose|Option\s+\d+|$)/i,
        /Context:\s*([\s\S]*?)(?=###|####|\*\*Option|\*\*Choose|Option\s+\d+|$)/i
    ];
    
    for (const pattern of contextPatterns) {
        const match = cleanResponse.match(pattern);
        if (match) {
            globalContext = match[1].trim();
            console.log('Found global context:', globalContext);
            break;
        }
    }
    
    // Dynamic option pattern matching
    const optionPatterns = [
        /(?:####\s*)?(?:\*\*)?Option\s+(\d+)\s+for\s+Step\s+(\d+):?\*?\*?\s*([\s\S]*?)(?=(?:####\s*)?(?:\*\*)?Option\s+\d+\s+for\s+Step\s+\d+:|Most recommended|Rationale:|This maintains|$)/gi,
        /(?:####\s*)?(?:\*\*)?option\s+(\d+)\s+for\s+Step\s+(\d+):\s*([\s\S]*?)(?=(?:####\s*)?(?:\*\*)?option\s+\d+\s+for\s+Step\s+\d+:|Most recommended|Rationale:|This maintains|$)/gi
    ];
    
    let optionsFound = false;
    
    for (const optionPattern of optionPatterns) {
        let match;
        const tempOptions = [];
        
        while ((match = optionPattern.exec(cleanResponse)) !== null) {
            const optionNumber = match[1];
            const stepNumber = match[2];
            const content = match[3].trim();
            
            console.log(`Found option ${optionNumber} for step ${stepNumber}:`, content);
            
            const parsedOption = parseOptionContent(content, globalContext, parseInt(optionNumber), parseInt(stepNumber));
            if (parsedOption) {
                tempOptions.push(parsedOption);
            }
        }
        
        if (tempOptions.length > 0) {
            currentOptions = tempOptions;
            optionsFound = true;
            break;
        }
        
        // Reset regex lastIndex for next pattern
        optionPattern.lastIndex = 0;
    }
    
    if (!optionsFound) {
        console.log('No options found with standard patterns, trying fallback parsing...');
        // Fallback: try to find any numbered options
        const fallbackPattern = /(\d+)[.)]\s*([\s\S]*?)(?=\d+[.)]|$)/g;
        let match;
        while ((match = fallbackPattern.exec(cleanResponse)) !== null) {
            const optionNumber = match[1];
            const content = match[2].trim();
            console.log(`Fallback found option ${optionNumber}:`, content);
            
            const parsedOption = parseOptionContent(content, globalContext, parseInt(optionNumber), currentStep);
            if (parsedOption) {
                currentOptions.push(parsedOption);
            }
        }
    }
    
    // Ensure all options have the same context (copy from first if needed)
    if (currentOptions.length > 0 && currentOptions[0].context) {
        const sharedContext = currentOptions[0].context;
        currentOptions.forEach(option => {
            if (!option.context || option.context.includes('Same as above')) {
                option.context = sharedContext;
            }
        });
    }
    
    console.log('Total options parsed:', currentOptions.length);
    console.log('Current options:', currentOptions);
    console.log('========================');
    
    displayOptions();
    
    // Save current options state
    saveConversationState();
}

// Helper function to parse individual option content
function parseOptionContent(content, globalContext, optionNumber, stepNumber) {
    console.log('=== PARSING OPTION CONTENT ===');
    console.log('Raw content:', content);
    
    // More precise patterns for the exact format
    const contextPatterns = [
        /Context:\s*([\s\S]*?)(?=\s+Choose next step:)/i,
        /\*\*Context:\*\*\s*([\s\S]*?)(?=\s+\*\*Choose next step:\*\*)/i,
        /Context:\s*([\s\S]*?)(?=\s+\*\*Choose next step:\*\*)/i
    ];
    
    // Multiple patterns for next step extraction
    const nextStepPatterns = [
        /Choose next step:\s*([^\n\r]+?)(?=\s+Reason:)/i,
        /\*\*Choose next step:\*\*\s*([^\n\r]+?)(?=\s+\*\*Reason:\*\*)/i,
        /Choose next step:\s*([^\n\r]+?)(?=\s+\*\*Reason:\*\*)/i
    ];
    
    // Multiple patterns for reason extraction
    const reasonPatterns = [
        /Reason:\s*([\s\S]*?)(?=Most recommended|Rationale:|This maintains|$)/i,
        /\*\*Reason:\*\*\s*([\s\S]*?)(?=Most recommended|Rationale:|This maintains|$)/i
    ];
    
    let contextMatch = null;
    let nextStepMatch = null;
    let reasonMatch = null;
    
    // Try context patterns
    for (const pattern of contextPatterns) {
        contextMatch = content.match(pattern);
        if (contextMatch) {
            console.log('Context pattern matched:', pattern);
            console.log('Context match:', contextMatch[1].trim());
            break;
        }
    }
    
    // Try next step patterns
    for (const pattern of nextStepPatterns) {
        nextStepMatch = content.match(pattern);
        if (nextStepMatch) {
            console.log('Next step pattern matched:', pattern);
            console.log('Next step match:', nextStepMatch[1].trim());
            break;
        }
    }
    
    // Try reason patterns
    for (const pattern of reasonPatterns) {
        reasonMatch = content.match(pattern);
        if (reasonMatch) {
            console.log('Reason pattern matched:', pattern);
            console.log('Reason match:', reasonMatch[1].trim());
            break;
        }
    }
    
    console.log('Parsing results:', {
        contextMatch: contextMatch ? contextMatch[1].trim() : null,
        nextStepMatch: nextStepMatch ? nextStepMatch[1].trim() : null,
        reasonMatch: reasonMatch ? reasonMatch[1].trim() : null,
        globalContext: globalContext ? 'available' : 'not available'
    });
    
    // Determine context to use - prioritize individual option context over global context
    let context = null;
    if (contextMatch) {
        context = contextMatch[1].trim().replace(/Same as above/gi, '').trim();
        console.log('Using individual option context:', context);
    } else if (globalContext) {
        context = globalContext;
        console.log('Using global context:', context);
    }
    
    if ((context || contextMatch) && nextStepMatch && reasonMatch) {
        const result = {
            optionNumber: optionNumber,
            stepNumber: stepNumber,
            context: context,
            nextStep: nextStepMatch[1].trim().replace(/\*\*/g, ''),
            reason: reasonMatch[1].trim(),
            originalContent: content
        };
        result.reason = "I used xxxxxxx operator" + " in this step, in order to \n" + result.reason;
        console.log('Successfully parsed option:', result);
        console.log('Final context being stored:', result.context);
        console.log('===============================');
        return result;
    } else {
        console.log('Failed to parse option content:', {
            hasContext: !!(context || contextMatch),
            hasNextStep: !!nextStepMatch,
            hasReason: !!reasonMatch
        });
        console.log('===============================');
        return null;
    }
}

// Display options as cards
function displayOptions() {
    optionsContainer.innerHTML = '';
    
    currentOptions.forEach((option, index) => {
        const card = createOptionCard(option, index);
        optionsContainer.appendChild(card);
    });
}

// Create option card
function createOptionCard(option, index) {
    console.log('=== CREATING OPTION CARD ===');
    console.log('Option index:', index);
    console.log('Option context being displayed:', option.context);
    console.log('Option next step:', option.nextStep);
    console.log('Option reason:', option.reason);
    console.log('============================');
    
    const card = document.createElement('div');
    card.className = 'option-card';
    card.dataset.optionIndex = index;
    
    card.innerHTML = `
        <div class="option-header">
            <span class="option-number">Option ${option.optionNumber}</span>
            <div class="option-actions">
                <button class="select-btn" onclick="selectAndEdit(${index})">Select & Edit</button>
                <button class="btn btn-secondary" style="background: #9b59b6; margin-left: 5px; padding: 5px 10px; font-size: 12px;" onclick="openOperatorSuggestions(${index})">🎯 Get Operators</button>
            </div>
        </div>
        <div class="option-content">
            <div class="option-field readonly">
                <label>Context:</label>
                <textarea readonly class="auto-resize-textarea">${option.context}</textarea>
            </div>
            <div class="option-field readonly">
                <label>Next Step:</label>
                <input type="text" readonly value="${option.nextStep}" style="display: none;">
                <div class="readonly-display">
                    <span class="clickable-category" onclick="showCategoryPopup('${option.nextStep.replace(/'/g, "\\'")}', event)">${option.nextStep}</span>
                </div>
            </div>
            <div class="option-field readonly">
                <label>Reason:</label>
                <textarea readonly class="auto-resize-textarea">${option.reason}</textarea>
            </div>
        </div>
    `;
    
    // Auto-resize textareas after creating the card
    setTimeout(() => {
        const textareas = card.querySelectorAll('.auto-resize-textarea');
        textareas.forEach(autoResizeTextarea);
    }, 0);
    
    return card;
}

// Auto-resize textarea function
function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, 60) + 'px';
}

// Select and edit option
function selectAndEdit(index) {
    const card = document.querySelector(`[data-option-index="${index}"]`);
    const fields = card.querySelectorAll('.option-field');
    
    // Remove readonly class and make fields editable
    fields.forEach(field => {
        field.classList.remove('readonly');
        const input = field.querySelector('input, textarea');
        const readonlyDisplay = field.querySelector('.readonly-display');
        
        if (input) {
            input.removeAttribute('readonly');
            // For Next Step field, show input and hide readonly display
            if (readonlyDisplay) {
                input.style.display = 'block';
                readonlyDisplay.style.display = 'none';
            }
        }
        
        // Add auto-resize functionality to textareas
        if (input && input.tagName === 'TEXTAREA') {
            input.addEventListener('input', () => autoResizeTextarea(input));
            autoResizeTextarea(input); // Initial resize
        }
    });
    
    // Update card state and show modal overlay
    card.classList.add('editing');
    modalOverlay.classList.add('active');
    
    // Update action buttons
    const actionsDiv = card.querySelector('.option-actions');
    actionsDiv.innerHTML = `
        <button class="save-btn" onclick="saveOption(${index})">Save Changes</button>
        <button class="cancel-btn" onclick="cancelEdit(${index})">Cancel</button>
        <button class="send-continue-btn" onclick="sendAndContinue(${index})">Send & Continue</button>
    `;
}

// Save option
function saveOption(index) {
    const card = document.querySelector(`[data-option-index="${index}"]`);
    const contextTextarea = card.querySelector('.option-field:nth-child(1) textarea');
    const nextStepInput = card.querySelector('.option-field:nth-child(2) input');
    const reasonTextarea = card.querySelector('.option-field:nth-child(3) textarea');
    
    // Update the option data
    currentOptions[index].context = contextTextarea.value;
    currentOptions[index].nextStep = nextStepInput.value;
    currentOptions[index].reason = reasonTextarea.value;
    
    // Save updated options state
    saveConversationState();
    
    // Make fields readonly again
    const fields = card.querySelectorAll('.option-field');
    fields.forEach(field => {
        field.classList.add('readonly');
        const input = field.querySelector('input, textarea');
        const readonlyDisplay = field.querySelector('.readonly-display');
        
        if (input) {
            input.setAttribute('readonly', 'readonly');
            // For Next Step field, hide input and show readonly display
            if (readonlyDisplay) {
                input.style.display = 'none';
                readonlyDisplay.style.display = 'block';
                // Update the clickable category text
                const categorySpan = readonlyDisplay.querySelector('.clickable-category');
                if (categorySpan) {
                    categorySpan.textContent = input.value;
                    categorySpan.setAttribute('onclick', `showCategoryPopup('${input.value.replace(/'/g, "\\'")}', event)`);
                }
            }
        }
    });
    
    // Update card state and hide modal overlay
    card.classList.remove('editing');
    modalOverlay.classList.remove('active');
    
    // Update action buttons
    const actionsDiv = card.querySelector('.option-actions');
    actionsDiv.innerHTML = `
        <button class="select-btn" onclick="selectAndEdit(${index})">Select & Edit</button>
    `;
    
    showNotification('Option saved successfully', 'success');
}

// Cancel edit
function cancelEdit(index) {
    // Hide modal overlay
    modalOverlay.classList.remove('active');
    
    // Refresh the card with original data
    const card = createOptionCard(currentOptions[index], index);
    const oldCard = document.querySelector(`[data-option-index="${index}"]`);
    oldCard.parentNode.replaceChild(card, oldCard);
}



// Get data state from category
function getDataStateFromCategory(category) {
    const stateMap = {
        'Basic Arithmetic & Mathematical Operations': 'mathematically transformed',
        'Logical & Conditional Operations': 'conditionally filtered',
        'Time Series: Change Detection & Value Comparison': 'change-analyzed',
        'Time Series: Statistical Feature Engineering': 'statistically engineered',
        'Time Series: Ranking, Scaling, and Normalization': 'ranked and normalized',
        'Time Series: Decay, Smoothing, and Turnover Control': 'smoothed and controlled',
        'Time Series: Extremes & Position Identification': 'extreme-identified',
        'Cross-Sectional: Ranking, Scaling, and Normalization': 'cross-sectionally normalized',
        'Cross-Sectional: Regression & Neutralization': 'neutralized',
        'Cross-Sectional: Distributional Transformation & Truncation': 'distributionally transformed',
        'Transformational & Filtering Operations': 'transformed and filtered',
        'Group Aggregation & Statistical Summary': 'aggregated',
        'Group Ranking, Scaling, and Normalization': 'group-normalized',
        'Group Regression & Neutralization': 'group-neutralized',
        'Group Imputation & Backfilling': 'imputed and backfilled'
    };
    
    return stateMap[category] || 'processed';
}

// Clear Options and Start Over
clearOptionsBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all progress and start over?')) {
        // Clear all state
        conversationHistory = [];
        currentStep = 1;
        pipelineSteps = [];
        currentOptions = [];
        currentDataState = 'raw data';
        
        // Clear session storage
        sessionStorage.removeItem('featureEngConversationHistory');
        sessionStorage.removeItem('featureEngCurrentStep');
        sessionStorage.removeItem('featureEngPipelineSteps');
        sessionStorage.removeItem('featureEngCurrentOptions');
        sessionStorage.removeItem('featureEngCurrentDataState');
        
        // Reset UI
        optionsSection.style.display = 'none';
        initialSetupSection.style.display = 'block';
        questionTemplateInput.value = '';
        
        // Update pipeline status to reflect cleared state
        updatePipelineStatus();
        
        showNotification('Pipeline cleared. You can start a new conversation.', 'success');
    }
});

// Export pipeline
exportPipelineBtn.addEventListener('click', () => {
    const exportData = {
        timestamp: new Date().toISOString(),
        currentStep: currentStep,
        pipelineSteps: pipelineSteps,
        currentOptions: currentOptions,
        conversationHistory: conversationHistory
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature_engineering_pipeline_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Pipeline exported successfully', 'success');
});

// Send edited option and continue
function sendAndContinue(index) {
    const card = document.querySelector(`[data-option-index="${index}"]`);
    const contextTextarea = card.querySelector('.option-field:nth-child(1) textarea');
    const nextStepInput = card.querySelector('.option-field:nth-child(2) input');
    const reasonTextarea = card.querySelector('.option-field:nth-child(3) textarea');
    
    // Get the edited values
    const context = contextTextarea.value;
    const chosenStep = nextStepInput.value;
    const reason = reasonTextarea.value;
    
    console.log('=== SEND AND CONTINUE DEBUG ===');
    console.log('Selected option index:', index);
    console.log('Current option:', currentOptions[index]);
    console.log('Context:', context);
    console.log('Chosen step:', chosenStep);
    console.log('Reason:', reason);
    console.log('Current step before update:', currentStep);
    console.log('Pipeline steps before update:', pipelineSteps);
    
    // Hide modal overlay
    modalOverlay.classList.remove('active');
    
    // Add to pipeline steps - Fix: Use currentStep instead of stepNumber from option
    pipelineSteps.push(`Step ${currentStep}: ${chosenStep}`);
    currentStep = currentStep + 1; // Increment from current step
    currentDataState = getDataStateFromCategory(chosenStep);
    
    console.log('Current step after update:', currentStep);
    console.log('Pipeline steps after update:', pipelineSteps);
    console.log('Current data state:', currentDataState);
    
    // Update pipeline status
    updatePipelineStatus();
    
    // Save pipeline state
    saveConversationState();
    
    // Prepare message in the proper format for the AI system prompt
    
    // Build the previous steps list
    const previousStepsText = pipelineSteps.length > 0 ? pipelineSteps.join(', ') : 'None';
    
    // Get the category description for the chosen step
    const categoryData = operatorsData.find(cat => cat.name === chosenStep);
    const stepDescription = categoryData ? categoryData.description : 'No description available';
    
    const userMessage = `

I Chosen next step: ${chosenStep}
The step description: ${stepDescription}
Reason for choice: ${reason}
based on my choice and info, please recommend me some further options`;
    
    console.log('=== CONSTRUCTED MESSAGE FOR AI ===');
    console.log('User message being sent:', userMessage);
    console.log('Current step:', currentStep);
    console.log('Previous steps:', previousStepsText);
    console.log('Current data state:', currentDataState);
    console.log('Step description:', stepDescription);
    console.log('Chosen next step:', chosenStep);
    console.log('Reason for choice:', reason);
    console.log('=================================');
    
    // Get next recommendations
    showLoading('Getting next recommendations...');
    
    fetch('/feature-engineering/api/continue-conversation', {
        method: 'POST',
        headers: {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            conversation_history: conversationHistory,
            user_message: userMessage,
            custom_system_prompt: customSystemPrompt,
            provider: modelProvider,
            model_name: modelName
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('=== SEND & CONTINUE PROMPT ===');
        console.log('User message:', userMessage);
        console.log('Current step before:', currentStep);
        console.log('Pipeline steps before:', pipelineSteps);
        console.log('Conversation history sent:', conversationHistory);
        console.log('=== AI RESPONSE ===');
        console.log('AI response:', data.response);
        console.log('==================');
        
        if (data.success) {
            // Add to conversation history
            conversationHistory.push({
                role: 'user',
                content: userMessage
            });
            conversationHistory.push({
                role: 'assistant',
                content: data.response
            });
            
            console.log('Updated conversation history:', conversationHistory);
            
            // Parse the new AI response
            parseAIResponse(data.response);
            
            // Save conversation state
            saveConversationState();
            
            showNotification(`Edited option sent successfully. Next step recommendations loaded.`, 'success');
        } else {
            showNotification(`Error: ${data.error || 'Unknown error'}`, 'error');
            console.error('API Error Details:', data);
        }
    })
    .catch(error => {
        showNotification('Error getting next recommendations: ' + error.message, 'error');
        console.error('Next Step Error:', error);
    })
    .finally(() => {
        hideLoading();
    });
}

// Make functions global for onclick handlers
window.selectAndEdit = selectAndEdit;
window.saveOption = saveOption;
window.cancelEdit = cancelEdit;
window.sendAndContinue = sendAndContinue;
window.closeSystemPromptModal = closeSystemPromptModal;
window.saveSystemPrompt = saveSystemPrompt;

// Update pipeline status
function updatePipelineStatus() {
    console.log('=== UPDATE PIPELINE STATUS ===');
    console.log('Pipeline steps:', pipelineSteps);
    console.log('Current step:', currentStep);
    console.log('Current data state:', currentDataState);
    
    if (pipelineSteps.length === 0) {
        pipelineStatus.style.display = 'none';
        return;
    }
    
    pipelineStatus.style.display = 'block';
    pipelineStepsDiv.innerHTML = pipelineSteps.map(step => 
        `<div class="pipeline-step"><strong>${step}</strong></div>`
    ).join('');
    
    // Add current status
    const statusDiv = document.createElement('div');
    statusDiv.className = 'pipeline-step';
    statusDiv.style.backgroundColor = '#e8f5e8';
    statusDiv.innerHTML = `<strong>Current Step:</strong> ${currentStep} | <strong>Data State:</strong> ${currentDataState}`;
    pipelineStepsDiv.appendChild(statusDiv);
    
    console.log('Pipeline status updated');
    console.log('==============================');
}

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

// Operators Reference Data
const operatorsData = [
    {
        id: 1,
        name: "Basic Arithmetic & Mathematical Operations",
        description: "Core mathematical and elementwise operations (e.g., add, subtract, multiply, log, exp, abs, power, etc.)",
        operators: ["add", "subtract", "multiply", "divide", "exp", "log", "abs", "power", "sqrt", "round", "round_down", "floor", "ceiling", "inverse", "negate", "signed_power", "sign", "arc_sin", "arc_cos", "arc_tan", "tanh", "sigmoid", "s_log_1p", "fraction", "max", "min", "densify", "pasteurize", "purify", "to_nan", "nan_out", "replace", "reverse"]
    },
    {
        id: 2,
        name: "Logical & Conditional Operations",
        description: "Boolean logic, comparisons, and conditional branching (e.g., and, or, not, if_else, equal, greater, less, etc.)",
        operators: ["and", "or", "not", "if_else", "equal", "not_equal", "less", "less_equal", "greater", "greater_equal", "is_nan", "is_not_nan", "is_finite", "is_not_finite", "nan_mask"]
    },
    {
        id: 3,
        name: "Time Series: Change Detection & Value Comparison",
        description: "Compare values over time, compute differences, detect changes, or count days since change (e.g., ts_delta, ts_returns, days_from_last_change, last_diff_value, etc.)",
        operators: ["ts_delta", "ts_returns", "days_from_last_change", "last_diff_value", "ts_delta_limit", "ts_backfill"]
    },
    {
        id: 4,
        name: "Time Series: Statistical Feature Engineering",
        description: "Calculate rolling statistical properties over time (e.g., ts_mean, ts_std_dev, ts_skewness, ts_kurtosis, ts_entropy, ts_moment, ts_covariance, ts_corr, ts_co_skewness, ts_co_kurtosis, etc.)",
        operators: ["ts_mean", "ts_std_dev", "ts_skewness", "ts_kurtosis", "ts_entropy", "ts_moment", "ts_covariance", "ts_corr", "ts_partial_corr", "ts_triple_corr", "ts_ir", "ts_sum", "ts_product", "ts_median", "ts_count_nans", "ts_av_diff", "ts_regression", "ts_poly_regression", "ts_vector_neut", "ts_vector_proj", "ts_co_skewness", "ts_co_kurtosis", "ts_theilsen", "ts_zscore", "ts_rank_gmean_amean_diff", "ts_step", "ts_delay", "inst_tvr", "generate_stats"]
    },
    {
        id: 5,
        name: "Time Series: Ranking, Scaling, and Normalization",
        description: "Rank, scale, or normalize time series data within a rolling window (e.g., ts_rank, ts_scale, ts_percentage, ts_quantile, etc.)",
        operators: ["ts_rank", "ts_scale", "ts_percentage", "ts_quantile", "ts_rank_gmean_amean_diff", "ts_zscore"]
    },
    {
        id: 6,
        name: "Time Series: Decay, Smoothing, and Turnover Control",
        description: "Apply decay (linear, exponential, weighted), smoothing, or control turnover in time series (e.g., ts_decay_exp_window, ts_decay_linear, ts_weighted_decay, ts_target_tvr_decay, hump, jump_decay, etc.)",
        operators: ["ts_decay_exp_window", "ts_decay_linear", "ts_weighted_decay", "ts_target_tvr_decay", "hump", "jump_decay", "ts_target_tvr_delta_limit", "ts_target_tvr_hump", "hump_decay"]
    },
    {
        id: 7,
        name: "Time Series: Extremes & Position Identification",
        description: "Identify min/max values, their differences, or the position (index) of extremes within a window (e.g., ts_min, ts_max, ts_min_diff, ts_max_diff, ts_arg_min, ts_arg_max, ts_min_max_diff, etc.)",
        operators: ["ts_min", "ts_max", "ts_min_diff", "ts_max_diff", "ts_arg_min", "ts_arg_max", "ts_min_max_diff", "ts_min_max_cps", "kth_element"]
    },
    {
        id: 8,
        name: "Cross-Sectional: Ranking, Scaling, and Normalization",
        description: "Rank, scale, normalize, or standardize data across instruments at a single time point (e.g., rank, zscore, scale_down, normalize, rank_by_side, etc.)",
        operators: ["rank", "zscore", "scale_down", "scale", "normalize", "rank_by_side", "generalized_rank", "one_side", "rank_gmean_amean_diff"]
    },
    {
        id: 9,
        name: "Cross-Sectional: Regression & Neutralization",
        description: "Remove effects of other variables, perform cross-sectional regression, or orthogonalize one vector with respect to another (e.g., regression_neut, vector_neut, regression_proj, vector_proj, multi_regression, etc.)",
        operators: ["regression_neut", "vector_neut", "regression_proj", "vector_proj", "multi_regression"]
    },
    {
        id: 10,
        name: "Cross-Sectional: Distributional Transformation & Truncation",
        description: "Transform distributions or truncate outliers across instruments (e.g., quantile, winsorize, truncate, bucket, generalized_rank, etc.)",
        operators: ["quantile", "winsorize", "truncate", "bucket", "right_tail", "left_tail", "tail"]
    },
    {
        id: 11,
        name: "Transformational & Filtering Operations",
        description: "General data transformation, filtering, clamping, masking, or conditional value assignment (e.g., filter, clamp, keep, tail, left_tail, right_tail, trade_when, etc.)",
        operators: ["filter", "clamp", "keep", "tail", "left_tail", "right_tail", "trade_when"]
    },
    {
        id: 12,
        name: "Group Aggregation & Statistical Summary",
        description: "Aggregate or summarize (e.g., mean, sum, std, min, max, median) within each group (such as industry, sector, country). Each stock receives the group-level value based on its group membership.",
        operators: ["group_mean", "group_sum", "group_std_dev", "group_min", "group_max", "group_median", "group_count", "group_percentage", "group_extra"]
    },
    {
        id: 13,
        name: "Group Ranking, Scaling, and Normalization",
        description: "Rank, scale, or normalize within each group (e.g., industry rank for each stock, scale values within sector). Each stock is ranked or scaled among its group peers.",
        operators: ["group_rank", "group_scale", "group_zscore", "group_normalize"]
    },
    {
        id: 14,
        name: "Group Regression & Neutralization",
        description: "Remove group-level effects, perform regression, or orthogonalize within each group (e.g., industry-neutralization, group-wise regression). Each group is treated independently.",
        operators: ["group_vector_neut", "group_vector_proj", "group_neutralize", "group_multi_regression"]
    },
    {
        id: 15,
        name: "Group Imputation & Backfilling",
        description: "Impute missing values or backfill using data from other stocks in the same group (e.g., fill NaN with group mean or median, group_backfill).",
        operators: ["group_backfill"]
    }
];

// Show category popup
function showCategoryPopup(categoryName, event) {
    event.stopPropagation();
    
    // Find the category data
    const categoryData = operatorsData.find(cat => cat.name === categoryName);
    
    if (!categoryData) {
        console.log('Category not found:', categoryName);
        return;
    }
    
    // Populate popup content
    categoryPopupTitle.textContent = categoryData.name;
    categoryPopupDescription.textContent = categoryData.description;
    categoryPopupOperatorsTitle.textContent = `Available Operators (${categoryData.operators.length}):`;
    
    const operatorsHtml = categoryData.operators.map(op => 
        `<span class="popup-operator-tag">${op}</span>`
    ).join('');
    categoryPopupOperators.innerHTML = operatorsHtml;
    
    // Position the popup near the clicked element
    const rect = event.target.getBoundingClientRect();
    const popup = categoryPopup;
    
    popup.style.display = 'block';
    
    // Calculate position
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 5;
    
    // Adjust if popup would go off-screen
    const popupRect = popup.getBoundingClientRect();
    if (left + popupRect.width > window.innerWidth) {
        left = window.innerWidth - popupRect.width - 20;
    }
    if (top + popupRect.height > window.innerHeight + window.scrollY) {
        top = rect.top + window.scrollY - popupRect.height - 5;
    }
    
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
}

// Hide category popup
function hideCategoryPopup() {
    categoryPopup.style.display = 'none';
}

// Make functions global for onclick handlers
window.showCategoryPopup = showCategoryPopup;
window.hideCategoryPopup = hideCategoryPopup;

// Function to save conversation state
function saveConversationState() {
    sessionStorage.setItem('featureEngConversationHistory', JSON.stringify(conversationHistory));
    sessionStorage.setItem('featureEngCurrentStep', currentStep.toString());
    sessionStorage.setItem('featureEngPipelineSteps', JSON.stringify(pipelineSteps));
    sessionStorage.setItem('featureEngCurrentOptions', JSON.stringify(currentOptions));
    sessionStorage.setItem('featureEngCurrentDataState', currentDataState);
    console.log('Conversation state saved to sessionStorage');
}

// Operator Suggestions Modal Functions
let currentOperatorModalIndex = -1;
let modalEvaluationResults = [];

// Open operator suggestions modal
function openOperatorSuggestions(index) {
    currentOperatorModalIndex = index;
    const option = currentOptions[index];
    
    // Set the target text from the option's reason instead of context
    let targetText = option.reason || 'No target specified';
    
    // Replace "I used xxxxxxx operator in this step, in order to " with "I want to"
    targetText = targetText.replace(/I used .*? operator in this step, in order to /gi, 'I want to ');
    
    document.getElementById('modalTargetText').textContent = targetText;
    
    // Clear previous results
    document.getElementById('modalCurrentExpression').value = '';
    document.getElementById('modalEvaluationSection').style.display = 'none';
    document.getElementById('modalProgressSection').style.display = 'none';
    document.getElementById('modalExportResults').style.display = 'none';
    
    // Check BRAIN connection status
    const sessionId = localStorage.getItem('brain_session_id');
    const storedOperators = sessionStorage.getItem('brainOperators');
    
    if (!sessionId) {
        // No BRAIN session, show connection notice
        document.getElementById('modalBrainNotice').style.display = 'block';
    } else if (!storedOperators) {
        // Has session but no operators, try to load them
        loadOperatorsFromBRAIN().then(operators => {
            if (operators.length > 0) {
                document.getElementById('modalBrainNotice').style.display = 'none';
            } else {
                document.getElementById('modalBrainNotice').style.display = 'block';
            }
        });
    } else {
        // Has operators, hide notice
        document.getElementById('modalBrainNotice').style.display = 'none';
    }
    
    // Show the modal
    document.getElementById('operatorSuggestionsModal').style.display = 'block';
    
    // Add event listeners for modal controls
    setupModalEventListeners();
    
    // Add click-outside-to-close functionality
    const modal = document.getElementById('operatorSuggestionsModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeOperatorSuggestionsModal();
        }
    });
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Remove existing listeners to prevent duplicates
    const startBtn = document.getElementById('modalStartEvaluation');
    const clearBtn = document.getElementById('modalClearExpression');
    const minScoreFilter = document.getElementById('modalMinScoreFilter');
    const showHighScores = document.getElementById('modalShowHighScores');
    const showMediumScores = document.getElementById('modalShowMediumScores');
    const showLowScores = document.getElementById('modalShowLowScores');
    const exportBtn = document.getElementById('modalExportResults');
    const editTargetBtn = document.getElementById('modalEditTarget');
    const saveTargetBtn = document.getElementById('modalSaveTarget');
    const cancelTargetBtn = document.getElementById('modalCancelTarget');
    
    // Clone elements to remove old listeners
    startBtn.replaceWith(startBtn.cloneNode(true));
    clearBtn.replaceWith(clearBtn.cloneNode(true));
    minScoreFilter.replaceWith(minScoreFilter.cloneNode(true));
    showHighScores.replaceWith(showHighScores.cloneNode(true));
    showMediumScores.replaceWith(showMediumScores.cloneNode(true));
    showLowScores.replaceWith(showLowScores.cloneNode(true));
    exportBtn.replaceWith(exportBtn.cloneNode(true));
    editTargetBtn.replaceWith(editTargetBtn.cloneNode(true));
    saveTargetBtn.replaceWith(saveTargetBtn.cloneNode(true));
    cancelTargetBtn.replaceWith(cancelTargetBtn.cloneNode(true));
    
    // Get fresh references
    const newStartBtn = document.getElementById('modalStartEvaluation');
    const newClearBtn = document.getElementById('modalClearExpression');
    const newMinScoreFilter = document.getElementById('modalMinScoreFilter');
    const newShowHighScores = document.getElementById('modalShowHighScores');
    const newShowMediumScores = document.getElementById('modalShowMediumScores');
    const newShowLowScores = document.getElementById('modalShowLowScores');
    const newExportBtn = document.getElementById('modalExportResults');
    const newEditTargetBtn = document.getElementById('modalEditTarget');
    const newSaveTargetBtn = document.getElementById('modalSaveTarget');
    const newCancelTargetBtn = document.getElementById('modalCancelTarget');
    
    // Add new listeners
    newStartBtn.addEventListener('click', startModalEvaluation);
    
    newClearBtn.addEventListener('click', () => {
        document.getElementById('modalCurrentExpression').value = '';
    });
    
    newMinScoreFilter.addEventListener('input', (e) => {
        document.getElementById('modalMinScoreValue').textContent = e.target.value;
        filterModalResults();
    });
    
    newShowHighScores.addEventListener('change', filterModalResults);
    newShowMediumScores.addEventListener('change', filterModalResults);
    newShowLowScores.addEventListener('change', filterModalResults);
    
    newExportBtn.addEventListener('click', exportModalResults);
    
    // Target editing listeners
    newEditTargetBtn.addEventListener('click', () => {
        const targetText = document.getElementById('modalTargetText').textContent;
        document.getElementById('modalTargetInput').value = targetText;
        document.getElementById('modalTargetDisplay').style.display = 'none';
        document.getElementById('modalTargetInputGroup').style.display = 'block';
        newEditTargetBtn.style.display = 'none';
    });
    
    newSaveTargetBtn.addEventListener('click', () => {
        const newTarget = document.getElementById('modalTargetInput').value.trim();
        if (newTarget) {
            document.getElementById('modalTargetText').textContent = newTarget;
            document.getElementById('modalTargetDisplay').style.display = 'block';
            document.getElementById('modalTargetInputGroup').style.display = 'none';
            newEditTargetBtn.style.display = 'inline-block';
            showNotification('Target updated successfully', 'success');
        } else {
            showNotification('Please enter a target description', 'error');
        }
    });
    
    newCancelTargetBtn.addEventListener('click', () => {
        document.getElementById('modalTargetDisplay').style.display = 'block';
        document.getElementById('modalTargetInputGroup').style.display = 'none';
        newEditTargetBtn.style.display = 'inline-block';
    });
}

// Start operator evaluation in modal
async function startModalEvaluation() {
    const expression = document.getElementById('modalCurrentExpression').value.trim();
    const target = document.getElementById('modalTargetText').textContent;
    
    if (!expression) {
        showNotification('Please enter an expression to evaluate', 'error');
        return;
    }
    
    if (!apiKey) {
        showNotification('Please configure your API key first', 'error');
        return;
    }
    
    // Get operators list
    let operators = [];
    const storedOperators = sessionStorage.getItem('brainOperators');
    
    if (storedOperators) {
        try {
            operators = JSON.parse(storedOperators);
        } catch (error) {
            console.error('Error parsing stored operators:', error);
        }
    }
    
    // If no operators from BRAIN, ask user for choice
    if (operators.length === 0) {
        const userChoice = confirm(
            'No BRAIN operators available. Would you like to:\n\n' +
            '• Click "OK" to connect to BRAIN and get 400+ operators\n' +
            '• Click "Cancel" to use fallback operators (40 operators)'
        );
        
        if (userChoice) {
            // User wants to connect to BRAIN
            closeOperatorSuggestionsModal();
            openBrainLoginModal();
            return;
        } else {
            // User chooses fallback operators
            operators = getFallbackOperators();
            showNotification('Using fallback operator list (40 operators).', 'info');
            document.getElementById('modalBrainNotice').style.display = 'block';
        }
    } else {
        // Hide BRAIN connection notice if operators are available
        document.getElementById('modalBrainNotice').style.display = 'none';
    }
    
    try {
        // Show progress section
        document.getElementById('modalProgressSection').style.display = 'block';
        document.getElementById('modalEvaluationSection').style.display = 'none';
        
        // Get operators from inspiration house API
        const response = await fetch('/inspiration-house/api/batch-evaluate', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                operators: operators,
                research_target: target,
                current_expression: expression,
                expression_context: `Feature engineering step ${currentStep}: ${currentOptions[currentOperatorModalIndex].nextStep}`,
                provider: modelProvider,
                model_name: modelName,
                batch_size: 100
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            modalEvaluationResults = data.results || [];
            displayModalResults();
            showNotification(`Evaluated ${modalEvaluationResults.length} operators`, 'success');
        } else {
            showNotification(`Evaluation failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showNotification('Error evaluating operators: ' + error.message, 'error');
        console.error('Modal evaluation error:', error);
    } finally {
        document.getElementById('modalProgressSection').style.display = 'none';
    }
}

// Display modal results
function displayModalResults() {
    const tableBody = document.getElementById('modalEvaluationTableBody');
    const summaryStats = document.getElementById('modalSummaryStats');
    
    if (modalEvaluationResults.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: #7f8c8d; font-style: italic; padding: 20px;">
                    No operators found. Try a different expression.
                </td>
            </tr>
        `;
        summaryStats.style.display = 'none';
        return;
    }
    
    // Calculate summary stats
    const highScores = modalEvaluationResults.filter(r => (r.score || 0) >= 8).length;
    const mediumScores = modalEvaluationResults.filter(r => (r.score || 0) >= 4 && (r.score || 0) < 8).length;
    const lowScores = modalEvaluationResults.filter(r => (r.score || 0) < 4).length;
    
    document.getElementById('modalHighScoreCount').textContent = highScores;
    document.getElementById('modalMediumScoreCount').textContent = mediumScores;
    document.getElementById('modalLowScoreCount').textContent = lowScores;
    summaryStats.style.display = 'grid';
    
    // Display results
    filterModalResults();
    
    // Show action buttons
    document.getElementById('modalExportResults').style.display = 'inline-block';
    
    // Show evaluation section
    document.getElementById('modalEvaluationSection').style.display = 'block';
}

// Filter modal results based on score and checkboxes
function filterModalResults() {
    const minScore = parseInt(document.getElementById('modalMinScoreFilter').value);
    const showHigh = document.getElementById('modalShowHighScores').checked;
    const showMedium = document.getElementById('modalShowMediumScores').checked;
    const showLow = document.getElementById('modalShowLowScores').checked;
    
    const filteredResults = modalEvaluationResults.filter(result => {
        const score = result.score || 0;
        if (score < minScore) return false;
        
        if (score >= 8 && !showHigh) return false;
        if (score >= 4 && score < 8 && !showMedium) return false;
        if (score < 4 && !showLow) return false;
        
        return true;
    });
    
    const tableBody = document.getElementById('modalEvaluationTableBody');
    
    if (filteredResults.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: #7f8c8d; font-style: italic; padding: 20px;">
                    No operators match the current filters.
                </td>
            </tr>
        `;
        return;
    }
    
    // Get operators list from sessionStorage (like inspiration_house.js does)
    let operatorsList = [];
    const storedOperators = sessionStorage.getItem('brainOperators');
    if (storedOperators) {
        try {
            operatorsList = JSON.parse(storedOperators);
        } catch (error) {
            console.error('Error parsing stored operators:', error);
        }
    }
    
    tableBody.innerHTML = filteredResults.map(result => {
        const operatorName = result.operator_name || result.operator || 'Unknown';
        const category = result.category || 'Unknown';
        const reason = result.reason || '';
        const score = result.score || 0;
        
        // Find the operator details from the operators list (like inspiration_house.js)
        const operatorDetails = operatorsList.find(op => op.name === operatorName);
        const description = operatorDetails ? operatorDetails.description || '' : '';
        const definition = operatorDetails ? operatorDetails.definition || '' : '';
        
        return `
            <tr>
                <td style="border: 1px solid #dee2e6; padding: 8px; vertical-align: top;">
                    <div class="operator-name">${operatorName}</div>
                    <div class="operator-category">${category}</div>
                    ${description ? `<div class="operator-description">${convertMarkdownToHTML(description)}</div>` : ''}
                    ${definition ? `<div class="operator-definition"><strong>Definition:</strong> ${convertMarkdownToHTML(definition)}</div>` : ''}
                </td>
                <td class="reason-text" style="border: 1px solid #dee2e6; padding: 8px; vertical-align: top;">${convertMarkdownToHTML(reason)}</td>
                <td class="score-cell score-${score >= 8 ? 'high' : score >= 4 ? 'medium' : 'low'}" style="border: 1px solid #dee2e6; padding: 8px; text-align: center; vertical-align: top;">${score}</td>
            </tr>
        `;
    }).join('');
}

// Copy operator to clipboard
function copyOperatorToClipboard(operatorName) {
    navigator.clipboard.writeText(operatorName).then(() => {
        showNotification(`Copied "${operatorName}" to clipboard`, 'success');
    }).catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
    });
}

// Export modal results
function exportModalResults() {
    const data = modalEvaluationResults.map(result => ({
        operator: result.operator_name,
        category: result.category,
        score: result.score,
        reason: result.reason,
        description: result.description
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operator_suggestions_step_${currentStep}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Results exported successfully', 'success');
}



// Close operator suggestions modal
function closeOperatorSuggestionsModal() {
    document.getElementById('operatorSuggestionsModal').style.display = 'none';
    currentOperatorModalIndex = -1;
    modalEvaluationResults = [];
}

// Convert markdown to HTML for better display (like inspiration_house.js)
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

// Get fallback operators list (when BRAIN is not connected)
function getFallbackOperators() {
    return [
        // Basic Arithmetic & Mathematical Operations
        { name: 'add', category: 'Basic Arithmetic & Mathematical Operations', description: 'Add two values' },
        { name: 'subtract', category: 'Basic Arithmetic & Mathematical Operations', description: 'Subtract two values' },
        { name: 'multiply', category: 'Basic Arithmetic & Mathematical Operations', description: 'Multiply two values' },
        { name: 'divide', category: 'Basic Arithmetic & Mathematical Operations', description: 'Divide two values' },
        { name: 'exp', category: 'Basic Arithmetic & Mathematical Operations', description: 'Exponential function' },
        { name: 'log', category: 'Basic Arithmetic & Mathematical Operations', description: 'Natural logarithm' },
        { name: 'abs', category: 'Basic Arithmetic & Mathematical Operations', description: 'Absolute value' },
        { name: 'power', category: 'Basic Arithmetic & Mathematical Operations', description: 'Raise to power' },
        { name: 'sqrt', category: 'Basic Arithmetic & Mathematical Operations', description: 'Square root' },
        
        // Time Series Operations
        { name: 'ts_mean', category: 'Time Series: Statistical Feature Engineering', description: 'Rolling mean over time' },
        { name: 'ts_std_dev', category: 'Time Series: Statistical Feature Engineering', description: 'Rolling standard deviation' },
        { name: 'ts_rank', category: 'Time Series: Ranking, Scaling, and Normalization', description: 'Rolling rank over time' },
        { name: 'ts_scale', category: 'Time Series: Ranking, Scaling, and Normalization', description: 'Rolling scaling over time' },
        { name: 'ts_delta', category: 'Time Series: Change Detection & Value Comparison', description: 'Time series difference' },
        { name: 'ts_returns', category: 'Time Series: Change Detection & Value Comparison', description: 'Time series returns' },
        { name: 'ts_min', category: 'Time Series: Extremes & Position Identification', description: 'Rolling minimum' },
        { name: 'ts_max', category: 'Time Series: Extremes & Position Identification', description: 'Rolling maximum' },
        { name: 'ts_decay_exp_window', category: 'Time Series: Decay, Smoothing, and Turnover Control', description: 'Exponential decay' },
        
        // Cross-Sectional Operations
        { name: 'rank', category: 'Cross-Sectional: Ranking, Scaling, and Normalization', description: 'Cross-sectional rank' },
        { name: 'zscore', category: 'Cross-Sectional: Ranking, Scaling, and Normalization', description: 'Cross-sectional z-score' },
        { name: 'scale', category: 'Cross-Sectional: Ranking, Scaling, and Normalization', description: 'Cross-sectional scaling' },
        { name: 'normalize', category: 'Cross-Sectional: Ranking, Scaling, and Normalization', description: 'Cross-sectional normalization' },
        { name: 'regression_neut', category: 'Cross-Sectional: Regression & Neutralization', description: 'Regression neutralization' },
        { name: 'vector_neut', category: 'Cross-Sectional: Regression & Neutralization', description: 'Vector neutralization' },
        { name: 'quantile', category: 'Cross-Sectional: Distributional Transformation & Truncation', description: 'Quantile transformation' },
        { name: 'winsorize', category: 'Cross-Sectional: Distributional Transformation & Truncation', description: 'Winsorize outliers' },
        
        // Logical & Conditional Operations
        { name: 'if_else', category: 'Logical & Conditional Operations', description: 'Conditional value assignment' },
        { name: 'equal', category: 'Logical & Conditional Operations', description: 'Equality comparison' },
        { name: 'greater', category: 'Logical & Conditional Operations', description: 'Greater than comparison' },
        { name: 'less', category: 'Logical & Conditional Operations', description: 'Less than comparison' },
        
        // Group Operations
        { name: 'group_mean', category: 'Group Aggregation & Statistical Summary', description: 'Group mean aggregation' },
        { name: 'group_rank', category: 'Group Ranking, Scaling, and Normalization', description: 'Group ranking' },
        { name: 'group_scale', category: 'Group Ranking, Scaling, and Normalization', description: 'Group scaling' },
        { name: 'group_vector_neut', category: 'Group Regression & Neutralization', description: 'Group vector neutralization' },
        
        // Transformational & Filtering Operations
        { name: 'filter', category: 'Transformational & Filtering Operations', description: 'Filter data' },
        { name: 'clamp', category: 'Transformational & Filtering Operations', description: 'Clamp values to range' },
        { name: 'keep', category: 'Transformational & Filtering Operations', description: 'Keep specific values' }
    ];
}

// Function to refresh operators after BRAIN connection
function refreshOperatorsAfterBrainLogin() {
    const storedOperators = sessionStorage.getItem('brainOperators');
    if (storedOperators) {
        try {
            const operators = JSON.parse(storedOperators);
            if (operators.length > 0) {
                // Hide BRAIN connection notice
                document.getElementById('modalBrainNotice').style.display = 'none';
                showNotification(`Successfully loaded ${operators.length} operators from BRAIN`, 'success');
                
                // Reopen the operator suggestions modal with BRAIN operators
                setTimeout(() => {
                    openOperatorSuggestions(currentOperatorModalIndex);
                }, 1000);
            }
        } catch (error) {
            console.error('Error parsing stored operators:', error);
        }
    }
}

// Override the original authenticateBrain function to refresh operators
const originalAuthenticateBrain = window.authenticateBrain;
window.authenticateBrain = async function() {
    if (originalAuthenticateBrain) {
        await originalAuthenticateBrain();
        // Load operators after successful authentication
        setTimeout(async () => {
            const operators = await loadOperatorsFromBRAIN();
            if (operators.length > 0) {
                refreshOperatorsAfterBrainLogin();
            }
        }, 2000);
    }
};

// Function to load operators from BRAIN (similar to inspiration_house.js)
async function loadOperatorsFromBRAIN() {
    try {
        // Get session ID from localStorage
        const sessionId = localStorage.getItem('brain_session_id');
        if (!sessionId) {
            showNotification('Please connect to BRAIN first to load operators', 'warning');
            return [];
        }
        
        const response = await fetch('/api/operators', {
            headers: {
                'Session-ID': sessionId
            }
        });
        const data = await response.json();
        
        if (response.ok && Array.isArray(data)) {
            const operators = data;
            sessionStorage.setItem('brainOperators', JSON.stringify(operators));
            console.log(`Loaded ${operators.length} operators from BRAIN`);
            showNotification(`Loaded ${operators.length} operators from BRAIN`, 'success');
            return operators;
        } else {
            console.error('Failed to load operators:', data.error);
            if (data.error && data.error.includes('Invalid or expired session')) {
                showNotification('Please connect to BRAIN first to load operators', 'warning');
            } else {
                showNotification('Failed to load operators from BRAIN', 'error');
            }
            return [];
        }
    } catch (error) {
        console.error('Error loading operators:', error);
        showNotification('Error connecting to BRAIN API', 'error');
        return [];
    }
}

// Make functions global for onclick handlers
window.openOperatorSuggestions = openOperatorSuggestions;
window.closeOperatorSuggestionsModal = closeOperatorSuggestionsModal;
window.copyOperatorToClipboard = copyOperatorToClipboard;
window.openBrainLoginModal = openBrainLoginModal;
window.closeBrainLoginModal = closeBrainLoginModal;