from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from .model import GPT, GPTConfig
from .tokenizer import BPETokenizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sample from TriTalk miniGPT v0.1.1.")
    parser.add_argument(
        "--checkpoint",
        default="tritalk_gpt_v011/runs/v011-large/checkpoint.pt",
        help="Path to checkpoint.pt or model.pt.",
    )
    parser.add_argument(
        "--tokenizer",
        default="tritalk_gpt_v011/data/corpus_v011/tokenizer.json",
        help="Path to tokenizer.json.",
    )
    parser.add_argument("--prompt", default="triathlon training")
    parser.add_argument("--max-new-tokens", type=int, default=60)
    parser.add_argument("--temperature", type=float, default=0.9)
    parser.add_argument("--top-k", type=int, default=30)
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "cpu", "cuda", "mps"],
    )
    return parser.parse_args()


def choose_device(name: str) -> str:
    if name != "auto":
        return name
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def load_model_config(checkpoint_payload: dict, checkpoint_path: Path) -> GPTConfig:
    if "config" not in checkpoint_payload:
        meta_path = checkpoint_path.with_name("meta.json")
        with meta_path.open("r", encoding="utf-8") as handle:
            meta = json.load(handle)
        return GPTConfig(**meta["config"])
    return GPTConfig(**checkpoint_payload["config"])


def main() -> int:
    args = parse_args()
    device = choose_device(args.device)

    tokenizer = BPETokenizer.load(args.tokenizer)
    checkpoint_path = Path(args.checkpoint)
    payload = torch.load(checkpoint_path, map_location=device)
    if isinstance(payload, dict) and "model_state" in payload:
        state_dict = payload["model_state"]
        config = load_model_config(payload, checkpoint_path)
    else:
        state_dict = payload
        with checkpoint_path.with_name("meta.json").open("r", encoding="utf-8") as handle:
            meta = json.load(handle)
        config = GPTConfig(**meta["config"])

    model = GPT(config)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    bos_id = tokenizer.stoi["<bos>"]
    prompt_ids = [bos_id]
    prompt_ids.extend(tokenizer.encode_ids(args.prompt))
    context = torch.tensor([prompt_ids], dtype=torch.long, device=device)
    generated = model.generate(
        context,
        max_new_tokens=args.max_new_tokens,
        temperature=args.temperature,
        top_k=args.top_k,
    )[0].tolist()

    print(tokenizer.decode_ids(generated))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
