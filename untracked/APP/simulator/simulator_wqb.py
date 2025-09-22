"""
Enhanced Alpha Template Generator Script

This script generates alpha templates with interactive user input for:
- JSON file path selection
- User authentication
- Simulation parameters
- Multi-simulation mode support
- Real-time log monitoring
"""

import asyncio
import wqb
import json
import os
import getpass
import threading
import time
import sys
import msvcrt  # For Windows password input with asterisks
from pathlib import Path

# FIX: Change working directory to script location to ensure logs are created in the right place
# This prevents the "Permission denied" error when trying to create logs in system directories
# The wqb.wqb_logger() function creates log files relative to the current working directory
script_dir = os.path.dirname(os.path.abspath(__file__))
try:
    os.chdir(script_dir)
    print(f"📁 工作目录已设置为: {os.getcwd()}")
    print(f"📝 日志文件将创建在: {os.getcwd()}")
    
    # Verify the directory is writable
    if not os.access(script_dir, os.W_OK):
        print(f"⚠️  警告: 目录 {script_dir} 不可写，日志可能无法创建")
    else:
        print(f"✅ 目录 {script_dir} 可写，日志将正常创建")
        
except Exception as e:
    print(f"⚠️  警告: 无法更改工作目录到 {script_dir}: {e}")
    print(f"📝 日志文件将创建在当前工作目录: {os.getcwd()}")

def get_password_with_asterisks(prompt):
    """Get password input with asterisks shown for each character"""
    print(prompt, end='', flush=True)
    password = ""
    
    while True:
        char = msvcrt.getch()
        
        # Handle Enter key (carriage return)
        if char == b'\r':
            print()  # New line
            break
        # Handle Backspace
        elif char == b'\x08':
            if len(password) > 0:
                password = password[:-1]
                # Move cursor back, print space, move cursor back again
                print('\b \b', end='', flush=True)
        # Handle Ctrl+C
        elif char == b'\x03':
            print()
            raise KeyboardInterrupt
        # Handle regular characters
        else:
            try:
                # Convert bytes to string
                char_str = char.decode('utf-8')
                if char_str.isprintable():
                    password += char_str
                    print('*', end='', flush=True)
            except UnicodeDecodeError:
                pass  # Ignore non-printable characters
    
    return password

def get_json_filepath():
    """Ask user to input the directory/filepath of expressions_with_settings.json"""
    while True:
        print("\n" + "="*60)
        print("JSON 文件配置")
        print("="*60)
        filepath = input("请复制粘贴 expressions_with_settings.json （即以json格式储存的带有setting的表达式列表）的目录或完整路径: ").strip()
        
        # Remove quotes if user copied with quotes
        filepath = filepath.strip('"').strip("'")
        
        # Check if it's a directory and try to find the file
        if os.path.isdir(filepath):
            json_path = os.path.join(filepath, "expressions_with_settings.json")
        else:
            json_path = filepath
            
        # Verify file exists
        if os.path.exists(json_path):
            try:
                with open(json_path, 'r') as f:
                    data = json.load(f)
                print(f"✓ 成功加载 JSON 文件: {json_path}")
                return json_path, data
            except json.JSONDecodeError:
                print("❌ 错误: JSON 文件格式无效，请检查文件。")
            except Exception as e:
                print(f"❌ 读取文件错误: {e}")
        else:
            print("❌ 错误: 文件未找到，请检查路径后重试。")

def get_user_credentials():
    """Ask user for brain username and password with asterisk password input"""
    print("\n" + "="*60)
    print("BRAIN 身份验证")
    print("="*60)
    
    username = input("请输入您的 BRAIN 用户名: ").strip()
    password = get_password_with_asterisks("请输入您的 BRAIN 密码 (显示为 *): ")
    
    return username, password

def test_authentication(username, password):
    """Test authentication and return session if successful"""
    print("\n" + "="*60)
    print("API连通验证")
    print("="*60)
    
    try:
        logger = wqb.wqb_logger()
        wqbs = wqb.WQBSession((username, password), logger=logger)
        
        # Test connection
        resp = wqbs.locate_field('open')
        print(f"连接测试结果: resp.ok = {resp.ok}")
        
        if resp.ok:
            print("✓ 身份验证成功！")
            return wqbs, logger
        else:
            print("❌ 身份验证失败，请检查您的用户名和密码。")
            return None, None
            
    except Exception as e:
        print(f"❌ 身份验证错误: {e}")
        return None, None

def get_simulation_parameters(expressions_count, json_path):
    """Get simulation parameters from user with validation"""
    print("\n" + "="*60)
    print("回测参数设置")
    print("="*60)
    print(f"JSON 中的表达式总数: {expressions_count}")
    
    # Get starting position
    while True:
        try:
            where_to_start = int(input(f"从列表中第几个表达式开始 (0 到 {expressions_count-1}): "))
            if 0 <= where_to_start < expressions_count:
                if where_to_start > 0:
                    print(f"\n⚠️  警告: 原始 JSON 文件将被直接覆盖！")
                    print(f"📝 原始文件: {expressions_count} 个表达式")
                    print(f"🔪 切割后: {expressions_count - where_to_start} 个表达式")
                    print(f"📂 文件位置: {json_path}")
                    print(f"\n🚨 重要提示: 如果您不希望覆盖原始文件，请立即关闭终端并手动备份文件！")
                    print(f"⏰ 5秒后将继续执行覆盖操作...")
                    
                    # Give user 5 seconds to think/close terminal
                    import time
                    for i in range(5, 0, -1):
                        print(f"倒计时: {i} 秒...", end='\r')
                        time.sleep(1)
                    print("             ")  # Clear countdown line
                    
                    confirm = input("(继续程序,开始回测y/返回并重选列表起始位置n): ").lower().strip()
                    if confirm != 'y':
                        print("请重新选择表达式列表起始位置。")
                        continue
                break
            else:
                print(f"❌ 起始位置无效，必须在 0 到 {expressions_count-1} 之间")
        except ValueError:
            print("❌ 请输入有效数字。")
    
    # Get concurrent count
    while True:
        try:
            concurrent_count = int(input("请输入并发回测数量 (最小值 1): "))
            if concurrent_count >= 1:
                break
            else:
                print("❌ 并发数量必须大于等于 1。")
        except ValueError:
            print("❌ 请输入有效数字。")
    
    return where_to_start, concurrent_count

def cut_json_file(json_path, expressions_with_settings, where_to_start):
    """Cut the JSON file from the starting point and overwrite the original file"""
    if where_to_start == 0:
        return expressions_with_settings  # No cutting needed
    
    # Cut the expressions list
    cut_expressions = expressions_with_settings[where_to_start:]
    
    # Overwrite the original JSON file
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(cut_expressions, f, ensure_ascii=False, indent=2)
        print(f"✓ 原始 JSON 文件已被覆盖")
        print(f"📊 新文件包含 {len(cut_expressions)} 个表达式")
        return cut_expressions
    except Exception as e:
        print(f"❌ 覆盖 JSON 文件失败: {e}")
        print(f"⚠️  将使用原始数据继续运行")
        return expressions_with_settings

def shuffle_json_file(json_path, expressions_with_settings):
    """Randomly shuffle the JSON elements and overwrite the file"""
    import random
    
    # Create a copy and shuffle it
    shuffled_expressions = expressions_with_settings.copy()
    random.shuffle(shuffled_expressions)
    
    # Overwrite the JSON file with shuffled data
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(shuffled_expressions, f, ensure_ascii=False, indent=2)
        print(f"✓ JSON 文件已随机打乱并覆盖")
        print(f"🔀 已打乱 {len(shuffled_expressions)} 个表达式的顺序")
        return shuffled_expressions
    except Exception as e:
        print(f"❌ 打乱 JSON 文件失败: {e}")
        print(f"⚠️  将使用原始顺序继续运行")
        return expressions_with_settings

def get_random_shuffle_choice():
    """Ask user if they want to randomly shuffle the expressions"""
    print("\n" + "="*60)
    print("随机模式选择")
    print("="*60)
    print("是否要随机打乱表达式顺序？")
    print("💡 这将改变表达式在文件中的排列顺序,以达到随机回测的目的")
    
    while True:
        choice = input("选择随机模式? (y/n): ").lower().strip()
        if choice in ['y', 'n']:
            return choice == 'y'
        else:
            print("❌ 请输入 y 或 n")

def get_multi_simulation_choice():
    """Ask user if they want to use multi-simulation mode"""
    print("\n" + "="*60)
    print("多重回测(multi-simulatioin)模式选择")
    print("="*60)
    print("是否要使用多重回测(multi-simulatioin)模式？")
    print("💡 多重回测(multi-simulatioin)可以将多个alpha组合在一个回测槽中运行")
    
    while True:
        choice = input("使用多重回测(multi-simulatioin)模式? (y/n): ").lower().strip()
        if choice in ['y', 'n']:
            return choice == 'y'
        else:
            print("❌ 请输入 y 或 n")

def get_alpha_count_per_slot():
    """Ask user how many alphas to put in one multi-simulation slot"""
    print("\n" + "="*60)
    print("多重回测(multi-simulatioin)槽配置")
    print("="*60)
    print("每个多重回测(multi-simulatioin)槽中放置多少个alpha？")
    print("💡 范围: 2-10 个alpha")
    
    while True:
        try:
            alpha_count = int(input("每个槽的alpha数量 (2-10): "))
            if 2 <= alpha_count <= 10:
                return alpha_count
            else:
                print("❌ 数量必须在 2 到 10 之间")
        except ValueError:
            print("❌ 请输入有效数字。")

def monitor_log_file(logger, stop_event, use_multi_sim=False, alpha_count_per_slot=None):
    """Monitor log file and print new lines in real-time"""
    print("\n📊 开始监控日志文件...")
    
    # Get current directory to look for log files
    current_dir = os.getcwd()
    log_file_path = None
    
    # First, try to find any existing wqb log files (including older ones)
    print("🔍 查找 WQB 日志文件...")
    
    # Look for any wqb*.log files in current directory
    wqb_files = []
    try:
        for file in os.listdir(current_dir):
            if file.startswith('wqb') and file.endswith('.log'):
                file_path = os.path.join(current_dir, file)
                wqb_files.append((file_path, os.path.getmtime(file_path)))
    except Exception as e:
        print(f"⚠️  扫描目录失败: {e}")
        return
    
    if wqb_files:
        # Sort by modification time, get the newest one
        log_file_path = sorted(wqb_files, key=lambda x: x[1], reverse=True)[0][0]
        print(f"✓ 监控已找到的最新日志文件: {log_file_path}")
    else:
        # Wait for new log file to be created
        print("等待新的 WQB 日志文件创建...")
        start_time = time.time()
        
        while not stop_event.is_set() and (time.time() - start_time) < 30:  # Wait max 30 seconds
            try:
                for file in os.listdir(current_dir):
                    if file.startswith('wqb') and file.endswith('.log'):
                        file_path = os.path.join(current_dir, file)
                        # Check if file was created recently (within last 120 seconds)
                        if os.path.getctime(file_path) > (time.time() - 120):
                            log_file_path = file_path
                            break
            except Exception:
                pass
            
            if log_file_path:
                break
            time.sleep(1)
        
        if not log_file_path:
            print("⚠️  未找到 WQB 日志文件，日志监控已禁用。")
            print("💡 提示: 日志文件通常在开始回测后才会创建")
            return
        else:
            print(f"✓ 找到新日志文件: {log_file_path}")
    
    if stop_event.is_set():
        return
    
    print("="*60)
    
    # Display multi-simulation information if applicable
    if use_multi_sim and alpha_count_per_slot:
        print("📌 重要提示：")
        print(f"以下是multi simulation的记录，你的设计是1个multi simulation中有{alpha_count_per_slot}个alpha，")
        print(f"因此需将实际回测数乘以该乘数，才得到实际已完成的Alpha个数。")
        print("="*60)
    
    try:
        # Start monitoring from current end of file
        with open(log_file_path, 'r', encoding='utf-8') as f:
            # Go to end of file
            f.seek(0, 2)
            
            while not stop_event.is_set():
                line = f.readline()
                if line:
                    # Clean up the log line and print it
                    clean_line = line.rstrip()
                    if clean_line:  # Only print non-empty lines
                        print(f"[日志] {clean_line}")
                else:
                    time.sleep(0.2)
    except Exception as e:
        print(f"⚠️  监控日志文件时出错: {e}")

async def automated_main(json_file_content, username, password, start_position=0, concurrent_count=3, 
                        random_shuffle=False, use_multi_sim=False, alpha_count_per_slot=3):
    """Automated main function for web interface - takes all parameters at once"""
    try:
        print("🧠 BRAIN Alpha 模板回测器 (自动模式)")
        print("="*60)
        
        # Parse JSON content directly
        import json
        expressions_with_settings = json.loads(json_file_content)
        expressions_count = len(expressions_with_settings)
        
        print(f"📊 已加载 {expressions_count} 个 alpha 配置")
        
        # Setup logger and session
        logger = wqb.wqb_logger()
        wqbs = wqb.WQBSession((username, password), logger=logger)
        
        # Test connection
        resp = wqbs.locate_field('open')
        print(f"连接测试结果: resp.ok = {resp.ok}")
        
        if not resp.ok:
            print("❌ 身份验证失败")
            return {"success": False, "error": "Authentication failed"}
        
        print("✅ 身份验证成功！")
        
        # Process expressions based on parameters
        if start_position > 0:
            expressions_with_settings = expressions_with_settings[start_position:]
            print(f"🔪 已从位置 {start_position} 开始切割，剩余 {len(expressions_with_settings)} 个表达式")
        
        if random_shuffle:
            import random
            random.shuffle(expressions_with_settings)
            print(f"🔀 已随机打乱 {len(expressions_with_settings)} 个表达式的顺序")
        
        if use_multi_sim:
            # Convert to multi-alphas format
            original_count = len(expressions_with_settings)
            expressions_with_settings = wqb.to_multi_alphas(expressions_with_settings, alpha_count_per_slot)
            print(f"✓ 已转换为多重回测(multi-simulatioin)格式")
            print(f"📊 原始表达式数: {original_count}")
            print(f"🎯 每槽alpha数: {alpha_count_per_slot}")
            
            
            # Write multi-simulation info to log
            multi_sim_msg = (f"[MULTI-SIMULATION MODE] 以下是multi simulation的记录，"
                            f"你的设计是1个multi simulation中有{alpha_count_per_slot}个alpha，"
                            f"因此需将实际回测数乘以该乘数，才得到实际已完成的Alpha个数。")
            logger.info("="*80)
            logger.info(multi_sim_msg)
            logger.info("="*80)
        
        print(f"🔄 使用 {concurrent_count} 个并发回测")
        print("\n" + "="*60)
        print("运行回测")
        print("="*60)
        
        if use_multi_sim:
            print("开始多重回测(multi-simulatioin)并发回测...")
        else:
            print("开始并发回测...")
        
        # Run simulations
        resps = await wqbs.concurrent_simulate(
            expressions_with_settings, 
            concurrent_count, 
            log_gap=10
        )
        
        # Collect results
        alpha_ids = []
        successful_count = 0
        failed_count = 0
        
        print("\n" + "="*60)
        print("回测结果")
        print("="*60)
        
        if use_multi_sim:
            print(f"成功完成 {len(resps)} 个多重回测(multi-simulatioin)槽的回测")
        else:
            print(f"成功完成 {len(resps)} 个回测")
        
        print("\nAlpha IDs:")
        for i, resp in enumerate(resps):
            try:
                alpha_id = resp.json()['alpha']
                alpha_ids.append(alpha_id)
                successful_count += 1
                print(f"  {i+1:4d}. {alpha_id}")
            except Exception as e:
                failed_count += 1
                print(f"  {i+1:4d}. 错误: {e}")
        
        print("\n✅ 处理完成!")
        
        return {
            "success": True,
            "results": {
                "total": len(resps),
                "successful": successful_count,
                "failed": failed_count,
                "alphaIds": alpha_ids,
                "use_multi_sim": use_multi_sim,
                "alpha_count_per_slot": alpha_count_per_slot if use_multi_sim else None
            }
        }
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        return {"success": False, "error": str(e)}

async def main():
    """Main function with interactive workflow"""
    print("🧠 BRAIN Alpha 模板回测器")
    print("="*60)
    
    # Step 1: Get JSON file and load expressions
    json_path, expressions_with_settings = get_json_filepath()
    expressions_count = len(expressions_with_settings)
    
    print(f"\n📊 已从以下位置加载 {expressions_count} 个 alpha 配置:")
    print(f"   {json_path}")
    
    # Step 2: Get credentials and test authentication
    wqbs = None
    logger = None
    
    while wqbs is None:
        username, password = get_user_credentials()
        wqbs, logger = test_authentication(username, password)
        
        if wqbs is None:
            retry = input("\n是否要重试? (y/n): ").lower().strip()
            if retry != 'y':
                print("正在退出...")
                return
    
    # Step 3: Get simulation parameters
    where_to_start, concurrent_count = get_simulation_parameters(expressions_count, json_path)
    
    # Step 3.5: Cut JSON file if needed
    if where_to_start > 0:
        print(f"\n🔪 正在切割 JSON 文件...")
        expressions_with_settings = cut_json_file(json_path, expressions_with_settings, where_to_start)
        where_to_start = 0  # Reset to 0 since we cut the file
    
    # Step 3.6: Ask for random shuffle option
    if get_random_shuffle_choice():
        print(f"\n🔀 正在随机打乱表达式顺序...")
        expressions_with_settings = shuffle_json_file(json_path, expressions_with_settings)
    
    # Step 3.7: Ask for multi-simulation mode
    use_multi_sim = get_multi_simulation_choice()
    alpha_count_per_slot = None
    
    if use_multi_sim:
        alpha_count_per_slot = get_alpha_count_per_slot()
        # Convert to multi-alphas format
        original_count = len(expressions_with_settings)
        expressions_with_settings = wqb.to_multi_alphas(expressions_with_settings, alpha_count_per_slot)
        print(f"\n✓ 已转换为多重回测(multi-simulatioin)格式")
        print(f"📊 原始表达式数: {original_count}")
        print(f"🎯 每槽alpha数: {alpha_count_per_slot}")
    
    # Calculate how many expressions will be processed
    print(f"🔄 使用 {concurrent_count} 个并发回测")
    
    # Step 4: Write multi-simulation info to log if applicable
    if use_multi_sim and alpha_count_per_slot and logger:
        multi_sim_msg = (f"[MULTI-SIMULATION MODE] 以下是multi simulation的记录，"
                        f"你的设计是1个multi simulation中有{alpha_count_per_slot}个alpha，"
                        f"因此需将实际回测数乘以该乘数，才得到实际已完成的Alpha个数。")
        logger.info("="*80)
        logger.info(multi_sim_msg)
        logger.info("="*80)
    
    # Step 5: Start log monitoring in background
    stop_log_monitor = threading.Event()
    log_thread = threading.Thread(
        target=monitor_log_file, 
        args=(logger, stop_log_monitor, use_multi_sim, alpha_count_per_slot),
        daemon=True
    )
    log_thread.start()
    
    # Step 6: Run simulations
    print("\n" + "="*60)
    print("运行回测")
    print("="*60)
    if use_multi_sim:
        print("开始多重回测(multi-simulatioin)并发回测...")
    else:
        print("开始并发回测...")
    
    try:
        resps = await wqbs.concurrent_simulate(
            expressions_with_settings, 
            concurrent_count, 
            log_gap=10
        )
        
        # Stop log monitoring
        stop_log_monitor.set()
        
        # Print results
        print("\n" + "="*60)
        print("回测结果")
        print("="*60)
        
        if use_multi_sim:
            print(f"成功完成 {len(resps)} 个多重回测(multi-simulatioin)槽的回测")
        else:
            print(f"成功完成 {len(resps)} 个回测")
        
        print("\nAlpha IDs:")
        for i, resp in enumerate(resps):
            try:
                alpha_id = resp.json()['alpha']
                print(f"  {i+1:4d}. {alpha_id}")
            except Exception as e:
                print(f"  {i+1:4d}. 错误: {e}")
                
    except KeyboardInterrupt:
        print("\n\n⚠️  回测被用户中断")
        stop_log_monitor.set()
    except Exception as e:
        print(f"\n❌ 回测错误: {e}")
        stop_log_monitor.set()
    
    print("\n✅ 处理完成!")

if __name__ == '__main__':
    asyncio.run(main()) 