from flask import Blueprint, render_template, request, jsonify
import requests
import json
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

inspiration_house_bp = Blueprint('inspiration_house', __name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@inspiration_house_bp.route('/')
def inspiration_house():
    """Main inspiration house page"""
    return render_template('inspiration_house.html')

@inspiration_house_bp.route('/api/test-deepseek', methods=['POST'])
def test_deepseek_api():
    """Test API connection for both Deepseek and Kimi"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400

        data = request.get_json()
        provider = data.get('provider', 'deepseek')
        model_name = data.get('model_name', 'deepseek-chat')

        # Test API with a simple request
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
        
        # Choose API endpoint based on provider
        if provider == 'kimi':
            # Use the correct Kimi API endpoint that was tested and confirmed working
            api_url = 'https://api.moonshot.cn/v1/chat/completions'
            
            kimi_data = {
                'model': model_name,
                'messages': [
                    {'role': 'user', 'content': 'Hello, this is a test message.'}
                ],
                'max_tokens': 10,
                'stream': False
            }
            
            logger.info(f"Testing Kimi API with correct endpoint: {api_url}")
            response = requests.post(api_url, headers=headers, json=kimi_data, timeout=10)
            logger.info(f"Kimi response status: {response.status_code}")
                
        else:
            # Default to Deepseek
            api_url = 'https://api.deepseek.com/chat/completions'
            response = requests.post(api_url, headers=headers, json=test_data, timeout=10)
        
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

@inspiration_house_bp.route('/api/evaluate-operator', methods=['POST'])
def evaluate_operator():
    """Evaluate a single operator against the research target"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400

        data = request.get_json()
        operator = data.get('operator', {})
        research_target = data.get('research_target', '')
        current_expression = data.get('current_expression', '')
        expression_context = data.get('expression_context', '')
        provider = data.get('provider', 'deepseek')
        model_name = data.get('model_name', 'deepseek-chat')
        
        if not operator or not research_target:
            return jsonify({'success': False, 'error': 'Operator and research target are required'}), 400

        # Build the evaluation prompt
        system_prompt = get_evaluation_system_prompt()
        user_prompt = build_evaluation_prompt(operator, research_target, current_expression, expression_context)

        # Make API call based on provider
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        if provider == 'kimi':
            # Use the correct Kimi API endpoint that was tested and confirmed working
            api_url = 'https://api.moonshot.cn/v1/chat/completions'
            
            api_data = {
                'model': model_name,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'max_tokens': 4096,
                'temperature': 0.3
            }
            
            response = requests.post(api_url, headers=headers, json=api_data, timeout=30)
                
        else:
            # Deepseek API structure
            api_url = 'https://api.deepseek.com/chat/completions'
            api_data = {
                'model': model_name,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'max_tokens': 4096,
                'temperature': 0.3
            }
            response = requests.post(api_url, headers=headers, json=api_data, timeout=30)
        
        if response.status_code == 200:
            response_data = response.json()
            
            # Both Kimi and Deepseek use the same OpenAI-compatible response structure
            ai_response = response_data['choices'][0]['message']['content']
            
            # Parse the AI response to extract score and reason
            score, reason = parse_evaluation_response(ai_response)
            
            return jsonify({
                'success': True,
                'score': score,
                'reason': reason,
                'operator': operator.get('name', 'Unknown'),
                'research_target': research_target
            })
        else:
            error_detail = response.text
            logger.error(f"{provider.capitalize()} API error: {response.status_code} - {error_detail}")
            return jsonify({'success': False, 'error': f'API returned status {response.status_code}: {error_detail}'}), 400
            
    except requests.exceptions.RequestException as e:
        logger.error(f"API request error: {str(e)}")
        return jsonify({'success': False, 'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Unexpected error in operator evaluation: {str(e)}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'}), 500

def get_evaluation_system_prompt():
    """Get the system prompt for operator evaluation"""
    return """You are an expert quantitative researcher and data scientist specializing in financial data analysis and algorithmic trading. Your task is to evaluate how well a specific BRAIN operator could be ADDED to the current expression to help achieve a given quant research target.

IMPORTANT: You are NOT suggesting replacements for the current expression. You are evaluating how each operator could be COMBINED with or applied AFTER the current expression to move closer to the target.

Your evaluation should be based on:
1. How the operator could be applied AFTER the current expression (e.g., ts_rank(current_expression))
2. The operator's mathematical and statistical properties when combined with the current expression
3. How this combination would better achieve the stated research target
4. The synergistic effects of applying this operator to the current expression

You must provide:
1. A score from 0-10 (where 10 is perfect synergistic addition to achieve the target)
2. A clear, concise reason explaining how this operator could be added to improve the current expression

Scoring Guidelines:
- 8-10: Excellent addition - operator would significantly enhance the current expression for the target
- 6-7: Good addition - operator would meaningfully improve the current expression
- 4-5: Moderate addition - operator could provide some benefit when combined
- 2-3: Weak addition - operator would add little value to the current expression
- 0-1: No value - operator would not help or might even hurt the current expression

Response Format:
Score: [number from 0-10]
Reason: [provide a detailed explanation of how this operator could be added to the current expression to better achieve the target. Include specific examples of how the combination would work and why it would be effective.]

Focus on combination effects and how the operator would enhance the current expression rather than replace it. Be thorough in your explanation."""

def build_evaluation_prompt(operator, research_target, current_expression, expression_context):
    """Build the user prompt for operator evaluation"""
    
    operator_info = f"""
Operator Name: {operator.get('name', 'Unknown')}
Operator Category: {operator.get('category', 'Unknown')}
Operator Description: {operator.get('description', 'No description available')}
"""
    
    context_info = f"""
Research Target: {research_target}
Current Expression: {current_expression if current_expression else 'None provided'}
Expression Context: {expression_context if expression_context else 'None provided'}
"""
    
    return f"""Please evaluate how well this BRAIN operator could be ADDED to the current expression to help achieve the research target.

{operator_info}

{context_info}

IMPORTANT: Consider how this operator could be applied AFTER the current expression (e.g., {operator.get('name', 'operator')}(current_expression)) to enhance the strategy. Do NOT suggest replacing the current expression.

Think about:
- How would applying this operator to the current expression improve the strategy?
- What synergistic effects would this combination create?
- How would this addition move us closer to the research target?

Response Format:
Score: [number from 0-10]
Reason: [provide a detailed explanation of how this operator could be added to the current expression to better achieve the target. Include specific examples of how the combination would work and why it would be effective.]"""

def parse_evaluation_response(response):
    """Parse the AI response to extract score and reason"""
    try:
        lines = response.strip().split('\n')
        score = 0
        reason = "No reason provided"
        in_reason_section = False
        reason_lines = []
        
        for line in lines:
            line = line.strip()
            if line.lower().startswith('score:'):
                try:
                    score_text = line.split(':', 1)[1].strip()
                    score = int(score_text)
                    # Ensure score is within valid range
                    score = max(0, min(10, score))
                except (ValueError, IndexError):
                    score = 0
            elif line.lower().startswith('reason:'):
                in_reason_section = True
                reason_text = line.split(':', 1)[1].strip()
                if reason_text:
                    reason_lines.append(reason_text)
            elif in_reason_section and line:
                # Continue collecting reason lines until we hit another section or empty line
                if line.lower().startswith(('score:', 'operator:', 'category:')):
                    break
                reason_lines.append(line)
        
        if reason_lines:
            reason = ' '.join(reason_lines)
        
        return score, reason
    except Exception as e:
        logger.error(f"Error parsing evaluation response: {str(e)}")
        return 0, f"Error parsing response: {str(e)}"

@inspiration_house_bp.route('/api/batch-evaluate', methods=['POST'])
def batch_evaluate_operators():
    """Evaluate multiple operators in parallel"""
    try:
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'success': False, 'error': 'API key is required'}), 400

        data = request.get_json()
        operators = data.get('operators', [])
        research_target = data.get('research_target', '')
        current_expression = data.get('current_expression', '')
        expression_context = data.get('expression_context', '')
        batch_size = data.get('batch_size', 100)  # Get batch size from request
        provider = data.get('provider', 'deepseek')
        model_name = data.get('model_name', 'deepseek-chat')
        
        if not operators or not research_target:
            return jsonify({'success': False, 'error': 'Operators and research target are required'}), 400

        # Use ThreadPoolExecutor for parallel processing
        # Use full parallelization for all providers
        max_workers = len(operators)
        logger.info(f"Using {max_workers} workers for API evaluation")
        
        results = []
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all evaluation tasks
            future_to_operator = {
                executor.submit(
                    evaluate_single_operator_async,
                    api_key,
                    operator,
                    research_target,
                    current_expression,
                    expression_context,
                    provider,
                    model_name
                ): operator for operator in operators
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_operator):
                operator = future_to_operator[future]
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    logger.error(f"Error evaluating operator {operator.get('name', 'Unknown')}: {str(e)}")
                    results.append({
                        'operator': operator.get('name', 'Unknown'),
                        'category': operator.get('category', 'Unknown'),
                        'score': 0,
                        'reason': f'Error: {str(e)}',
                        'timestamp': None
                    })

        return jsonify({
            'success': True,
            'results': results,
            'total_evaluated': len(results),
            'workers_used': max_workers,
            'total_operators': len(operators)
        })
        
    except Exception as e:
        logger.error(f"Unexpected error in batch evaluation: {str(e)}")
        return jsonify({'success': False, 'error': f'Unexpected error: {str(e)}'}), 500

def evaluate_single_operator_async(api_key, operator, research_target, current_expression, expression_context, provider='deepseek', model_name='deepseek-chat'):
    """Evaluate a single operator asynchronously"""
    try:
        # Build the evaluation prompt
        system_prompt = get_evaluation_system_prompt()
        user_prompt = build_evaluation_prompt(operator, research_target, current_expression, expression_context)

        # Make API call based on provider
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        
        if provider == 'kimi':
            # Use the correct Kimi API endpoint that was tested and confirmed working
            api_url = 'https://api.moonshot.cn/v1/chat/completions'
            
            api_data = {
                'model': model_name,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'max_tokens': 4096,
                'temperature': 0.3
            }
            
            response = requests.post(api_url, headers=headers, json=api_data, timeout=30)
                
        else:
            # Deepseek API structure
            api_url = 'https://api.deepseek.com/chat/completions'
            api_data = {
                'model': model_name,
                'messages': [
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                'max_tokens': 4096,
                'temperature': 0.3
            }
            response = requests.post(api_url, headers=headers, json=api_data, timeout=30)
        
        if response.status_code == 200:
            response_data = response.json()
            
            # Both Kimi and Deepseek use the same OpenAI-compatible response structure
            ai_response = response_data['choices'][0]['message']['content']
            
            # Parse the AI response to extract score and reason
            score, reason = parse_evaluation_response(ai_response)
            
            return {
                'operator': operator.get('name', 'Unknown'),
                'category': operator.get('category', 'Unknown'),
                'score': score,
                'reason': reason,
                'timestamp': None
            }
        else:
            error_detail = response.text
            logger.error(f"{provider.capitalize()} API error for operator {operator.get('name', 'Unknown')}: {response.status_code} - {error_detail}")
            return {
                'operator': operator.get('name', 'Unknown'),
                'category': operator.get('category', 'Unknown'),
                'score': 0,
                'reason': f'API Error: {response.status_code}',
                'timestamp': None
            }
            
    except requests.exceptions.Timeout as e:
        logger.error(f"Timeout error evaluating operator {operator.get('name', 'Unknown')}: {str(e)}")
        return {
            'operator': operator.get('name', 'Unknown'),
            'category': operator.get('category', 'Unknown'),
            'score': 0,
            'reason': f'API Timeout: Request took too long to complete',
            'timestamp': None
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error evaluating operator {operator.get('name', 'Unknown')}: {str(e)}")
        return {
            'operator': operator.get('name', 'Unknown'),
            'category': operator.get('category', 'Unknown'),
            'score': 0,
            'reason': f'Network Error: {str(e)}',
            'timestamp': None
        }
    except Exception as e:
        logger.error(f"Error evaluating operator {operator.get('name', 'Unknown')}: {str(e)}")
        return {
            'operator': operator.get('name', 'Unknown'),
            'category': operator.get('category', 'Unknown'),
            'score': 0,
            'reason': f'Error: {str(e)}',
            'timestamp': None
        } 