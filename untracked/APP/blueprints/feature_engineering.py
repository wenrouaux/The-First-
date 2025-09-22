from flask import Blueprint, render_template, request, jsonify
import requests
import json
import logging

feature_engineering_bp = Blueprint('feature_engineering', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@feature_engineering_bp.route('/')
def feature_engineering():
    """Main feature engineering page"""
    return render_template('feature_engineering.html')

@feature_engineering_bp.route('/api/test-deepseek', methods=['POST'])
def test_deepseek_api():
    """Test API connection for both Deepseek and Kimi"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400

        data = request.get_json() or {}
        provider = data.get('provider', 'deepseek')
        model_name = data.get('model_name', 'deepseek-chat')

        # Set up API endpoint and headers based on provider
        if provider == 'kimi':
            api_url = 'https://api.moonshot.cn/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
        else:  # deepseek
            api_url = 'https://api.deepseek.com/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }

        test_data = {
            'model': model_name,
            'messages': [
                {'role': 'user', 'content': 'Hello, this is a test message.'}
            ],
            'max_tokens': 10
        }
        
        response = requests.post(
            api_url,
            headers=headers,
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 200:
            return jsonify({'success': True, 'message': f'{provider.capitalize()} API connection successful'})
        else:
            error_detail = response.text
            return jsonify({'success': False, 'error': f'API returned status {response.status_code}: {error_detail}'}), 400
            
    except requests.exceptions.RequestException as e:
        logger.error(f"API test error: {str(e)}")
        return jsonify({'success': False, 'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in API test: {str(e)}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'}), 500

@feature_engineering_bp.route('/api/get-recommendations', methods=['POST'])
def get_feature_engineering_recommendations():
    """Get feature engineering recommendations from API"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400

        data = request.get_json()
        current_step = data.get('current_step', 1)
        data_field = data.get('data_field', '')
        previous_steps = data.get('previous_steps', [])
        current_data_state = data.get('current_data_state', 'raw data')
        provider = data.get('provider', 'deepseek')
        model_name = data.get('model_name', 'deepseek-chat')
        
        if not data_field:
            return jsonify({'success': False, 'error': 'Data field description is required'}), 400

        # Build the system prompt
        system_prompt = get_default_system_prompt_text()

        # Build the user prompt
        previous_steps_text = "None" if not previous_steps else ", ".join([f"Step {i+1}: {step}" for i, step in enumerate(previous_steps)])
        
        user_prompt = f"""Context:
Current step: {current_step}
Current data field: {data_field}
Previous steps and categories used: {previous_steps_text}
Current data state: {current_data_state}"""

        # Set up API endpoint and headers based on provider
        if provider == 'kimi':
            api_url = 'https://api.moonshot.cn/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
        else:  # deepseek
            api_url = 'https://api.deepseek.com/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
        
        api_data = {
            'model': model_name,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ],
            'max_tokens': 8192,
            'temperature': 0.7
        }
        
        response = requests.post(
            api_url,
            headers=headers,
            json=api_data,
            timeout=120
        )
        
        if response.status_code == 200:
            response_data = response.json()
            recommendations = response_data['choices'][0]['message']['content']
            
            return jsonify({
                'success': True,
                'recommendations': recommendations,
                'current_step': current_step,
                'data_field': data_field,
                'previous_steps': previous_steps,
                'current_data_state': current_data_state
            })
        else:
            error_detail = response.text
            logger.error(f"{provider.capitalize()} API error: {response.status_code} - {error_detail}")
            return jsonify({'success': False, 'error': f'API returned status {response.status_code}: {error_detail}'}), 400
            
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {str(e)}")
        return jsonify({'success': False, 'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in get recommendations: {str(e)}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'}), 500

@feature_engineering_bp.route('/api/continue-conversation', methods=['POST'])
def continue_conversation():
    """Continue the conversation with follow-up questions"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400

        data = request.get_json()
        conversation_history = data.get('conversation_history', [])
        user_message = data.get('user_message', '')
        custom_system_prompt = data.get('custom_system_prompt', None)
        provider = data.get('provider', 'deepseek')
        model_name = data.get('model_name', 'deepseek-chat')
        
        if not user_message:
            return jsonify({'success': False, 'error': 'User message is required'}), 400

        # Build conversation messages
        messages = []
        
        # Use custom system prompt if provided, otherwise use default
        if custom_system_prompt:
            system_prompt = custom_system_prompt
        else:
            system_prompt = get_default_system_prompt_text()

        messages.append({'role': 'system', 'content': system_prompt})
        
        # Add conversation history
        for msg in conversation_history:
            messages.append(msg)
        
        # Add new user message
        messages.append({'role': 'user', 'content': user_message})
        print(user_message)
        
        # Set up API endpoint and headers based on provider
        if provider == 'kimi':
            api_url = 'https://api.moonshot.cn/v1/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
        else:  # deepseek
            api_url = 'https://api.deepseek.com/chat/completions'
            headers = {
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            }
        
        api_data = {
            'model': model_name,
            'messages': messages,
            'max_tokens': 8192,
            'temperature': 0.7
        }
        
        response = requests.post(
            api_url,
            headers=headers,
            json=api_data,
            timeout=120
        )
        
        if response.status_code == 200:
            response_data = response.json()
            assistant_response = response_data['choices'][0]['message']['content']
            
            return jsonify({
                'success': True,
                'response': assistant_response
            })
        else:
            error_detail = response.text
            logger.error(f"{provider.capitalize()} API error: {response.status_code} - {error_detail}")
            return jsonify({'success': False, 'error': f'API returned status {response.status_code}: {error_detail}'}), 400
            
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {str(e)}")
        return jsonify({'success': False, 'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in continue conversation: {str(e)}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'}), 500

def get_default_system_prompt_text():
    """Get the default system prompt text"""
    return """You are an expert feature engineering assistant. Your job is to help design a multi-step feature engineering pipeline, with up to 6 steps, for a given data field. At each step, you will recommend the most viable feature engineering category (from a set of 15 categories) based on the current data state, the previous steps, and the high-level goal.

Instructions:

At each step, you will be given:

The current step number.

The current data field and its description.

The previous steps and categories used (if any).

The current data state (e.g., normalized, filtered, etc.).

Your task is to:

List the most viable feature engineering categories for the next step, choosing from the following 15 categories:

Basic Arithmetic & Mathematical Operations

Logical & Conditional Operations

Time Series: Change Detection & Value Comparison

Time Series: Statistical Feature Engineering

Time Series: Ranking, Scaling, and Normalization

Time Series: Decay, Smoothing, and Turnover Control

Time Series: Extremes & Position Identification

Cross-Sectional: Ranking, Scaling, and Normalization

Cross-Sectional: Regression & Neutralization

Cross-Sectional: Distributional Transformation & Truncation

Transformational & Filtering Operations

Group Aggregation & Statistical Summary

Group Ranking, Scaling, and Normalization

Group Regression & Neutralization

Group Imputation & Backfilling

For each recommended category, present your answer in the following format:

Repeat the full context for each option.

Explicitly state the chosen next step category.

Give a concise reason for the choice.

Output Format:

Viable categories for Step X:

option 1 for Step X: Context: Current step: [number] Current data field: [description] Previous steps and categories used: [list] Current data state: [description in very detail of how the data is transformed to the current state by the previous steps and its logic] Choose next step: [Category Name] Reason: [explanation]

option 2 for Step X: Context: Current step: [number] Current data field: [description] Previous steps and categories used: [list] Current data state: [description in very detail of how the data is transformed to the current state by the previous steps and its logic] Choose next step: [Category Name] Reason: [explanation]

... (continue for all viable options, Only recommend categories that are logical and meaningful given the current data state and previous steps.)

Additional Instructions:


If certain categories are not appropriate at this step, do not list them.

Be concise and clear in your explanations.

Do not suggest operators unless specifically requested.

You will receive the following input at each step:

Context:

Current step:

Current data field:

Previous steps and categories used:

Current data state:

When you receive the input, respond in the format above.
IMPORTANT: Do NOT include any summary, recommendations, rationale, or additional explanations after the options. Only provide the options in the exact format above. Do NOT add sections like "Most recommended choice", "Rationale", "Best Choice", or "Would you like to proceed". Stop immediately after listing all options.

"""

@feature_engineering_bp.route('/api/get-default-system-prompt', methods=['GET'])
def get_default_system_prompt():
    """Get the default system prompt"""
    try:
        return jsonify({
            'success': True,
            'default_system_prompt': get_default_system_prompt_text()
        })
        
    except Exception as e:
        logger.error(f"Error getting default system prompt: {str(e)}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'}), 500 