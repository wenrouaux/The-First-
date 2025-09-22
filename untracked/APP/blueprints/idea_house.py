"""
Idea House Blueprint - Flask Blueprint for analyzing data fields using Coze API
"""

from flask import Blueprint, render_template, request, jsonify, session as flask_session
import os
import sys
from cozepy import Coze, TokenAuth, Message, ChatStatus, MessageContentType
from cozepy import COZE_CN_BASE_URL
import json

# Create blueprint
idea_house_bp = Blueprint('idea_house', __name__, url_prefix='/idea-house')

@idea_house_bp.route('/')
def idea_house():
    """Idea house page"""
    return render_template('idea_house.html')

@idea_house_bp.route('/api/process-fields', methods=['POST'])
def process_fields():
    """Process selected data fields using Coze API"""
    try:
        # Get the selected fields from request
        data = request.get_json()
        selected_fields = data.get('selected_fields', {})
        coze_api_token = data.get('coze_api_token')
        workflow_id = data.get('workflow_id')
        dataset_description = data.get('dataset_description', '')
        
        print("=" * 60)
        print("🚀 COZE API REQUEST INITIATED")
        print("=" * 60)
        print(f"📋 Selected Fields Count: {len(selected_fields)}")
        print(f"🔑 API Token (last 10 chars): ...{coze_api_token[-10:] if coze_api_token else 'None'}")
        print(f"⚙️  Workflow ID: {workflow_id}")
        print("=" * 60)
        
        if not selected_fields:
            print("❌ ERROR: No fields selected")
            return jsonify({'error': 'No fields selected'}), 400
        
        if not coze_api_token:
            print("❌ ERROR: Coze API token is required")
            return jsonify({'error': 'Coze API token is required'}), 400
        
        if not workflow_id:
            print("❌ ERROR: Workflow ID is required")
            return jsonify({'error': 'Workflow ID is required'}), 400
        
        # Prepare the input string from selected fields
        # Format: "field_id (description, unit)"
        input_lines = []
        for field_id, description in selected_fields.items():
            input_lines.append(f"{field_id} ({description})")
        
        input_string = "\n".join(input_lines)
        
        # Append dataset description if available
        if dataset_description:
            input_string = f"Dataset Description: {dataset_description}\n\nSelected Fields:\n{input_string}"
        
        print("📤 PREPARING COZE API REQUEST:")
        print(f"   Input String: {input_string[:100]}..." if len(input_string) > 100 else f"   Input String: {input_string}")
        
        # Setup Coze API
        coze_api_base = COZE_CN_BASE_URL
        print(f"🌐 Using Coze API Base URL: {coze_api_base}")
        
        # Initialize Coze client
        print("🔧 Initializing Coze client...")
        coze = Coze(auth=TokenAuth(token=coze_api_token), base_url=coze_api_base)
        
        # Prepare parameters
        parameters = {
            "input": input_string
        }
        
        print("📊 Request Parameters:")
        print(f"   {json.dumps(parameters, indent=2)}")
        
        # Call the workflow with retries
        workflow_result = None
        error_message = None
        
        print("🔄 Starting workflow execution with retries...")
        for attempt in range(3):
            try:
                print(f"   Attempt {attempt + 1}/3: Calling Coze workflow...")
                workflow = coze.workflows.runs.create(
                    workflow_id=workflow_id,
                    parameters=parameters
                )
                workflow_result = workflow
                print(f"   ✅ Attempt {attempt + 1} succeeded!")
                print(f"   📥 Workflow Response Type: {type(workflow_result)}")
                if hasattr(workflow_result, 'data'):
                    print(f"   📥 Response Data Length: {len(str(workflow_result.data)) if workflow_result.data else 0}")
                break
            except Exception as e:
                error_message = f"Attempt {attempt + 1} failed with error: {str(e)}"
                print(f"   ❌ {error_message}")
                continue
        
        if workflow_result is None:
            print("💥 WORKFLOW EXECUTION FAILED AFTER ALL RETRIES")
            print(f"   Last Error: {error_message}")
            return jsonify({
                'error': 'Failed to run workflow after 3 attempts',
                'details': error_message
            }), 500
        
        print("✅ WORKFLOW EXECUTION SUCCESSFUL")
        print("🔍 Processing workflow result...")
        
        # Process the result
        try:
            # Try to extract output from workflow data
            if hasattr(workflow_result, 'data') and workflow_result.data:
                print("   📊 Workflow data found, processing...")
                # Try to evaluate the data if it's a string
                try:
                    result_data = eval(workflow_result.data) if isinstance(workflow_result.data, str) else workflow_result.data
                    output = result_data.get('output', '')
                    print(f"   📄 Extracted output length: {len(str(output))}")
                except:
                    # If eval fails, use the data as is
                    output = str(workflow_result.data)
                    print(f"   📄 Using raw data as output (length: {len(output)})")
            else:
                output = "No data returned from the workflow"
                print("   ⚠️  No data returned from workflow")
            
            print("=" * 60)
            print("🎉 COZE API REQUEST COMPLETED SUCCESSFULLY")
            print(f"📊 Final Output Preview: {str(output)[:150]}..." if len(str(output)) > 150 else f"📊 Final Output: {str(output)}")
            print("=" * 60)
            
            return jsonify({
                'success': True,
                'output': output,
                'parameters': parameters,
                'selected_fields': selected_fields
            })
            
        except Exception as parse_error:
            print(f"💥 ERROR PARSING WORKFLOW RESULT: {str(parse_error)}")
            print(f"   Raw workflow.data: {workflow_result.data if hasattr(workflow_result, 'data') else 'No data attribute'}")
            
            return jsonify({
                'error': 'Error parsing workflow result',
                'details': str(parse_error),
                'raw_data': str(workflow_result.data) if hasattr(workflow_result, 'data') else None
            }), 500
            
    except Exception as e:
        print(f"💥 PROCESS FIELDS ERROR: {str(e)}")
        print("=" * 60)
        return jsonify({'error': str(e)}), 500

@idea_house_bp.route('/api/get-datafields-proxy', methods=['GET'])
def get_datafields_proxy():
    """Proxy endpoint to get data fields from main app's BRAIN API endpoint"""
    try:
        from flask import current_app
        
        # Use the test client to make an internal request
        with current_app.test_client() as client:
            # Copy headers from the original request
            headers = {
                'Session-ID': request.headers.get('Session-ID') or flask_session.get('brain_session_id')
            }
            
            # Copy query parameters
            params = request.args.to_dict()
            
            # Make internal request to the main app's datafields endpoint
            response = client.get('/api/datafields', headers=headers, query_string=params)
            
            # Return the response data and status
            return response.get_json(), response.status_code
            
    except Exception as e:
        print(f"Datafields proxy error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@idea_house_bp.route('/api/get-dataset-description', methods=['GET'])
def get_dataset_description():
    """Proxy endpoint to get dataset description from main app's BRAIN API endpoint"""
    print("\n" + "="*60)
    print("🔍 DATASET DESCRIPTION PROXY ENDPOINT CALLED")
    print("="*60)
    
    try:
        from flask import current_app
        
        # Use the test client to make an internal request
        with current_app.test_client() as client:
            # Copy headers from the original request
            headers = {
                'Session-ID': request.headers.get('Session-ID') or flask_session.get('brain_session_id')
            }
            
            # Copy query parameters
            params = request.args.to_dict()
            
            print(f"📊 Proxying request with params: {params}")
            print(f"📌 Session ID: {headers.get('Session-ID')}")
            
            # Make internal request to the main app's dataset description endpoint
            response = client.get('/api/dataset-description', headers=headers, query_string=params)
            
            print(f"📥 Proxy response status: {response.status_code}")
            
            # Return the response data and status
            return response.get_json(), response.status_code
            
    except Exception as e:
        print(f"💥 Dataset description proxy error: {str(e)}")
        print("="*60 + "\n")
        return jsonify({'error': str(e)}), 500 