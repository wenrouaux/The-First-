import os
import json
import asyncio
from simulator import simulator_wqb

class BatchProcessor:
    """
    Handles the serial processing of multiple JSON files, with checkpointing
    to support resuming interrupted batch simulations.
    """
    def __init__(self, wqbs, file_paths, concurrent_count, use_multi_sim=False, alpha_count_per_slot=None):
        """
        Initializes the BatchProcessor.

        Args:
            wqbs: An authenticated wqb.WQBSession object.
            file_paths (list): A list of absolute paths to the JSON files to be processed.
            concurrent_count (int): The number of concurrent simulations to run inside each file.
            use_multi_sim (bool): Flag for multi-simulation mode.
            alpha_count_per_slot (int): Number of alphas per slot in multi-sim mode.
        """
        self.wqbs = wqbs
        self.file_paths = file_paths
        self.concurrent_count = concurrent_count
        self.use_multi_sim = use_multi_sim
        self.alpha_count_per_slot = alpha_count_per_slot

    def _get_checkpoint_path(self, file_path):
        """Generates the path for the checkpoint file."""
        return f"{file_path}.checkpoint"

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
        print("="*80)

        for i, file_path in enumerate(self.file_paths):
            print(f"\n--- 文件 {i+1}/{len(self.file_paths)}: {os.path.basename(file_path)} ---")

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    all_expressions = json.load(f)
                if not isinstance(all_expressions, list):
                    print(f"❌ 错误: JSON 文件内容不是一个列表。跳过此文件。")
                    continue
            except Exception as e:
                print(f"❌ 错误: 无法读取或解析 JSON 文件 {file_path}: {e}. 跳过此文件。")
                continue

            checkpoint_path = self._get_checkpoint_path(file_path)
            completed_hashes = self._load_completed_hashes(checkpoint_path)
            
            print(f"🔍 在检查点文件中找到 {len(completed_hashes)} 个已完成的 Alpha。")

            expressions_to_run = [
                expr for expr in all_expressions 
                if simulator_wqb.get_alpha_hash(expr) not in completed_hashes
            ]
            
            if not expressions_to_run:
                print("🎉 此文件中的所有 Alpha 均已完成回测。跳至下一个文件。")
                continue

            print(f"📊 待回测 Alpha 数量: {len(expressions_to_run)} / {len(all_expressions)}")

            # Run the simulation for the remaining alphas in the current file
            newly_successful_hashes, results_summary = await simulator_wqb.run_simulations_and_get_hashes(
                self.wqbs,
                expressions_to_run,
                self.concurrent_count,
                self.use_multi_sim,
                self.alpha_count_per_slot
            )

            self._append_hashes_to_checkpoint(checkpoint_path, newly_successful_hashes)
            
            print(f"📄 文件处理完毕: {os.path.basename(file_path)}")
            print(f"   - 本次成功: {results_summary.get('successful_alphas', 0)} 个 Alphas")
            print(f"   - 本次失败: {results_summary.get('failed_alphas', 0)} 个 Alphas")
            print(f"   - 生成的 Alpha IDs: {len(results_summary.get('alphaIds', []))} 个")
            print("-" * (len(os.path.basename(file_path)) + 22))

        print("\n" + "="*80)
        print("✨ 所有文件批处理完成! ✨")
        print("="*80)
