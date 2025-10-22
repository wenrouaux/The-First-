import os
import json
import asyncio
import traceback
from simulator import simulator_wqb

class BatchProcessor:
    """
    Handles the serial processing of multiple JSON files, with checkpointing
    to support resuming interrupted batch simulations.
    """
    def __init__(self, wqbs, file_paths, batch_name, concurrent_count, use_multi_sim=False, alpha_count_per_slot=None):
        """
        Initializes the BatchProcessor.

        Args:
            wqbs: An authenticated wqb.WQBSession object.
            file_paths (list): A list of absolute paths to the JSON files to be processed.
            batch_name (str): The unique name for this batch run.
            concurrent_count (int): The number of concurrent simulations to run inside each file.
            use_multi_sim (bool): Flag for multi-simulation mode.
            alpha_count_per_slot (int): Number of alphas per slot in multi-sim mode.
        """
        self.wqbs = wqbs
        self.file_paths = file_paths
        self.batch_name = batch_name
        self.concurrent_count = concurrent_count
        self.use_multi_sim = use_multi_sim
        self.alpha_count_per_slot = alpha_count_per_slot
        self.checkpoint_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'checkpoints')
        os.makedirs(self.checkpoint_dir, exist_ok=True)

    def _get_checkpoint_path(self):
        """Generates the path for the checkpoint file based on the batch name."""
        # Sanitize the batch name to make it a valid filename
        safe_batch_name = "".join(c for c in self.batch_name if c.isalnum() or c in ('-', '_', '.')).strip()
        if not safe_batch_name:
            safe_batch_name = "default_batch"
        return os.path.join(self.checkpoint_dir, f"{safe_batch_name}.checkpoint")

    def _load_completed_hashes(self, checkpoint_path):
        """Loads a set of completed alpha hashes from a checkpoint file."""
        if not os.path.exists(checkpoint_path):
            return set()
        try:
            with open(checkpoint_path, 'r', encoding='utf-8') as f:
                return {line.strip() for line in f if line.strip()}
        except Exception as e:
            print(f"⚠️  警告: 无法读取检查点文件 {checkpoint_path}: {e}. 将从头开始处理。")
            return set()

    def _append_hashes_to_checkpoint(self, checkpoint_path, hashes_to_append):
        """Appends a list of new hashes to the checkpoint file."""
        if not hashes_to_append:
            return
        try:
            with open(checkpoint_path, 'a', encoding='utf-8') as f:
                for h in hashes_to_append:
                    f.write(f"{h}\n")
            print(f"✅ 已将 {len(hashes_to_append)} 个新完成的 Alpha Hash 更新到检查点: {os.path.basename(checkpoint_path)}")
        except Exception as e:
            print(f"❌ 错误: 无法更新检查点文件 {checkpoint_path}: {e}")

    async def run(self):
        """
        Runs the batch processing for all specified files serially.
        """
        print("\n" + "="*80)
        print("🏁 开始多文件批处理...")
        print(f"📂 待处理文件总数: {len(self.file_paths)}")
        print(f"DEBUG: 初始文件列表: {self.file_paths}")
        print("="*80)

        try:
            # A single checkpoint file for the entire batch, identified by batch_name
            checkpoint_path = self._get_checkpoint_path()
            completed_hashes = self._load_completed_hashes(checkpoint_path)
            print(f"🏷️ 当前批次名称: '{self.batch_name}'")
            print(f"🗂️ 使用检查点文件: {checkpoint_path}")
            print(f"🔍 在批次检查点中找到 {len(completed_hashes)} 个已完成的 Alpha。")

            all_expressions_from_all_files = []
            for file_path in self.file_paths:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        expressions = json.load(f)
                    if isinstance(expressions, list):
                        all_expressions_from_all_files.extend(expressions)
                    else:
                        print(f"⚠️  警告: 文件 {os.path.basename(file_path)} 内容不是列表，已跳过。")
                except Exception as e:
                    print(f"⚠️  警告: 无法读取或解析文件 {os.path.basename(file_path)}: {e}。已跳过。")
            
            print(f"📂 从 {len(self.file_paths)} 个文件中总共加载了 {len(all_expressions_from_all_files)} 个 Alpha 表达式。")

            expressions_to_run = [
                expr for expr in all_expressions_from_all_files
                if simulator_wqb.get_alpha_hash(expr) not in completed_hashes
            ]

            if not expressions_to_run:
                print("🎉 此批次中的所有 Alpha 均已完成回测。")
            else:
                print(f"📊 待回测 Alpha 数量: {len(expressions_to_run)} / {len(all_expressions_from_all_files)}")
                
                newly_successful_hashes, results_summary = await simulator_wqb.run_simulations_and_get_hashes(
                    self.wqbs,
                    expressions_to_run,
                    self.concurrent_count,
                    self.use_multi_sim,
                    self.alpha_count_per_slot
                )

                self._append_hashes_to_checkpoint(checkpoint_path, newly_successful_hashes)
                
                print("\n" + "-"*30)
                print("本次运行结果摘要:")
                print(f"  - 成功: {results_summary.get('successful_alphas', 0)} 个 Alphas")
                print(f"  - 失败: {results_summary.get('failed_alphas', 0)} 个 Alphas")
                print(f"  - 生成的 Alpha IDs: {len(results_summary.get('alphaIds', []))} 个")
                print("-" * 30)

        except Exception as e:
            print(f"🔥🔥🔥 在批处理主循环中发生严重错误: {e}")
            print(traceback.format_exc())
            print("🔥🔥🔥 批处理已终止。")

        print("\n" + "="*80)
        print("✨ 所有文件批处理完成! ✨")
        print("="*80)
