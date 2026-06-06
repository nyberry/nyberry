from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from .model import GPT, GPTConfig
from .text import tokenize_words


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sample from a trained TriTalk GPT.")
    parser.add_argument(
        "--checkpoint",
        default="tritalk_gpt/runs/tritalk-small/model.pt",
        help="Path to trained model weights.",
    )
    parser.add_argument(
        "--meta",
        default="tritalk_gpt/runs/tritalk-small/meta.json",
        help="Path to metadata JSON from training.",
    )
    parser.add_argument("--prompt", default="triathlon training")
    parser.add_argument("--max-new-tokens", type=int, default=40)
    parser.add_argument("--temperature", type=float, default=0.9)
    parser.add_argument("--top-k", type=int, default=20)
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


def detokenize(tokens: list[str]) -> str:
    output: list[str] = []
    attach_left = {".", ",", "!", "?", ":", ";", ")", "]", "'s"}
    attach_right = {"(", "["}

    for token in tokens:
        if not output:
            output.append(token)
        elif token in attach_left:
            output[-1] = output[-1] + token
        elif output[-1] in attach_right:
            output[-1] = output[-1] + token
        else:
            output.append(" " + token)
    return "".join(output)


def main() -> int:
    args = parse_args()
    device = choose_device(args.device)

    with Path(args.meta).open("r", encoding="utf-8") as handle:
        meta = json.load(handle)

    config = GPTConfig(**meta["config"])
    model = GPT(config)
    state_dict = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    stoi = meta["stoi"]
    itos = {int(key): value for key, value in meta["itos"].items()}
    unk_id = stoi["<unk>"]
    bos_id = stoi["<bos>"]
    eos_id = stoi["<eos>"]

    keep_case = bool(meta.get("tokenization", {}).get("keep_case", False))
    prompt_tokens = tokenize_words(args.prompt, lowercase=not keep_case)
    prompt_ids = [bos_id]
    prompt_ids.extend(stoi.get(token, unk_id) for token in prompt_tokens)

    context = torch.tensor([prompt_ids], dtype=torch.long, device=device)
    generated = model.generate(
        context,
        max_new_tokens=args.max_new_tokens,
        temperature=args.temperature,
        top_k=args.top_k,
    )[0].tolist()

    tokens: list[str] = []
    for token_id in generated:
        token = itos[token_id]
        if token in {"<pad>", "<bos>"}:
            continue
        if token == "<eos>":
            break
        tokens.append(token)

    print(detokenize(tokens))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
