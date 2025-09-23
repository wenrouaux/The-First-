import argparse
import asyncio
import wqb
import sys
import os
from batch_processor import BatchProcessor

# Ensure the script can find other modules in the same directory
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

async def main():
    """
    The main entry point for the independent batch simulation process.
    Parses command-line arguments, authenticates with BRAIN, and
    starts the batch processor.
    """
    parser = argparse.ArgumentParser(description="BRAIN Alpha Batch Simulation Runner")
    parser.add_argument('--manifest', required=True, help="Path to a manifest file containing the list of JSON file paths.")
    parser.add_argument('--username', required=True, help="BRAIN username.")
    parser.add_argument('--password', required=True, help="BRAIN password.")
    parser.add_argument('--concurrent', type=int, default=3, help="Number of concurrent simulations.")
    parser.add_argument('--multi-sim', action='store_true', help="Enable multi-simulation mode.")
    parser.add_argument('--alphas-per-slot', type=int, default=3, help="Number of alphas per slot for multi-simulation.")
    
    args = parser.parse_args()

    print("="*80)
    print("🚀 独立批处理脚本已启动")
    print(f"🔩 PID: {os.getpid()}")
    print("="*80)

    # 1. Authenticate with BRAIN
    print("🔐 正在进行 BRAIN 身份验证...")
    try:
        logger = wqb.wqb_logger()
        wqbs = wqb.WQBSession((args.username, args.password), logger=logger)
        
        # Test connection
        resp = wqbs.locate_field('open')
        if not resp.ok:
            print("❌ 身份验证失败. 请检查您的用户名和密码。")
            print(f"   响应: {resp.text}")
            return
        
        print("✅ 身份验证成功！")
    except Exception as e:
        print(f"❌ 身份验证过程中发生严重错误: {e}")
        return

    # 2. Initialize and run the BatchProcessor
    try:
        # Read file paths from the manifest file
        with open(args.manifest, 'r', encoding='utf-8') as f:
            file_paths = [line.strip() for line in f if line.strip()]
        
        processor = BatchProcessor(
            wqbs=wqbs,
            file_paths=file_paths,
            concurrent_count=args.concurrent,
            use_multi_sim=args.multi_sim,
            alpha_count_per_slot=args.alphas_per_slot
        )
        await processor.run()
    except Exception as e:
        print(f"❌ 在批处理过程中发生严重错误: {e}")
    
    finally:
        print("\n" + "="*80)
        print("🛑 批处理脚本执行完毕。")
        print("="*80)

if __name__ == '__main__':
    # Set the event loop policy for Windows compatibility
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 用户手动中断了批处理脚本。")
