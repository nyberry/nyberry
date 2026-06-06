from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import torch

from .model import GPT, GPTConfig

SPECIAL_TOKENS = ["<pad>", "<bos>", "<eos>", "<unk>"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a small word-level GPT.")
    parser.add_argument(
        "--input",
        default="tritalk_gpt/data/corpus/posts.txt",
        help="Prepared tokenized corpus from tritalk_gpt.prepare.",
    )
    parser.add_argument(
        "--out-dir",
        default="tritalk_gpt/runs/tritalk-small",
        help="Directory for checkpoints and metadata.",
    )
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--block-size", type=int, default=64)
    parser.add_argument("--n-layer", type=int, default=4)
    parser.add_argument("--n-head", type=int, default=4)
    parser.add_argument("--n-embd", type=int, default=128)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--max-steps", type=int, default=2500)
    parser.add_argument("--eval-interval", type=int, default=250)
    parser.add_argument("--eval-iters", type=int, default=50)
    parser.add_argument("--min-frequency", type=int, default=2)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument(
        "--init-from",
        default="",
        help="Optional checkpoint path to continue training from.",
    )
    parser.add_argument(
        "--device",
        default="auto",
        choices=["auto", "cpu", "cuda", "mps"],
        help="Training device.",
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


def read_posts(path: str | Path) -> list[list[str]]:
    posts: list[list[str]] = []
    with Path(path).open("r", encoding="utf-8") as handle:
        for line in handle:
            tokens = line.strip().split()
            if tokens:
                posts.append(tokens)
    return posts


def build_vocab(posts: list[list[str]], min_frequency: int) -> tuple[list[str], dict[str, int]]:
    counts: dict[str, int] = {}
    for post in posts:
        for token in post:
            counts[token] = counts.get(token, 0) + 1

    vocab = list(SPECIAL_TOKENS)
    vocab.extend(sorted(token for token, count in counts.items() if count >= min_frequency))
    stoi = {token: idx for idx, token in enumerate(vocab)}
    return vocab, stoi


def encode_posts(posts: list[list[str]], stoi: dict[str, int]) -> list[int]:
    bos_id = stoi["<bos>"]
    eos_id = stoi["<eos>"]
    unk_id = stoi["<unk>"]

    ids: list[int] = []
    for post in posts:
        ids.append(bos_id)
        ids.extend(stoi.get(token, unk_id) for token in post)
        ids.append(eos_id)
    return ids


def get_batch(
    data: torch.Tensor,
    *,
    batch_size: int,
    block_size: int,
    device: str,
) -> tuple[torch.Tensor, torch.Tensor]:
    starts = torch.randint(len(data) - block_size - 1, (batch_size,))
    x = torch.stack([data[start : start + block_size] for start in starts])
    y = torch.stack([data[start + 1 : start + block_size + 1] for start in starts])
    return x.to(device), y.to(device)


@torch.no_grad()
def estimate_loss(
    model: GPT,
    train_data: torch.Tensor,
    val_data: torch.Tensor,
    *,
    batch_size: int,
    block_size: int,
    eval_iters: int,
    device: str,
) -> dict[str, float]:
    model.eval()
    losses: dict[str, float] = {}
    for split_name, split_data in (("train", train_data), ("val", val_data)):
        split_losses = torch.zeros(eval_iters)
        for step in range(eval_iters):
            xb, yb = get_batch(
                split_data,
                batch_size=batch_size,
                block_size=block_size,
                device=device,
            )
            _, loss = model(xb, yb)
            split_losses[step] = loss.item()
        losses[split_name] = split_losses.mean().item()
    model.train()
    return losses


def main() -> int:
    args = parse_args()
    random.seed(args.seed)
    torch.manual_seed(args.seed)

    device = choose_device(args.device)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    posts = read_posts(args.input)
    if not posts:
        raise ValueError("No posts found in the prepared corpus.")

    vocab, stoi = build_vocab(posts, args.min_frequency)
    itos = {idx: token for idx, token in enumerate(vocab)}
    all_ids = encode_posts(posts, stoi)
    if len(all_ids) <= args.block_size + 1:
        raise ValueError("Corpus is too small for the chosen block size.")

    split_index = int(len(all_ids) * 0.9)
    if split_index <= args.block_size or len(all_ids) - split_index <= args.block_size:
        raise ValueError("Need more data or a smaller block size.")

    train_data = torch.tensor(all_ids[:split_index], dtype=torch.long)
    val_data = torch.tensor(all_ids[split_index:], dtype=torch.long)

    config = GPTConfig(
        vocab_size=len(vocab),
        block_size=args.block_size,
        n_layer=args.n_layer,
        n_head=args.n_head,
        n_embd=args.n_embd,
        dropout=args.dropout,
    )
    model = GPT(config).to(device)
    if args.init_from:
        state_dict = torch.load(args.init_from, map_location=device)
        model.load_state_dict(state_dict)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        weight_decay=args.weight_decay,
    )

    keep_case = False
    stats_path = Path(args.input).with_name("stats.json")
    if stats_path.exists():
        with stats_path.open("r", encoding="utf-8") as handle:
            stats = json.load(handle)
        keep_case = bool(stats.get("keep_case", False))

    best_val = float("inf")
    for step in range(1, args.max_steps + 1):
        xb, yb = get_batch(
            train_data,
            batch_size=args.batch_size,
            block_size=args.block_size,
            device=device,
        )
        _, loss = model(xb, yb)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()

        if step == 1 or step % args.eval_interval == 0 or step == args.max_steps:
            metrics = estimate_loss(
                model,
                train_data,
                val_data,
                batch_size=args.batch_size,
                block_size=args.block_size,
                eval_iters=args.eval_iters,
                device=device,
            )
            print(
                f"step {step:5d} | "
                f"train loss {metrics['train']:.4f} | "
                f"val loss {metrics['val']:.4f}"
            )
            if metrics["val"] < best_val:
                best_val = metrics["val"]
                torch.save(model.state_dict(), out_dir / "model.pt")

    meta = {
        "vocab": vocab,
        "stoi": stoi,
        "itos": itos,
        "config": {
            "block_size": args.block_size,
            "n_layer": args.n_layer,
            "n_head": args.n_head,
            "n_embd": args.n_embd,
            "dropout": args.dropout,
            "vocab_size": len(vocab),
        },
        "training": {
            "batch_size": args.batch_size,
            "learning_rate": args.learning_rate,
            "weight_decay": args.weight_decay,
            "max_steps": args.max_steps,
            "min_frequency": args.min_frequency,
            "device": device,
            "seed": args.seed,
            "best_val_loss": best_val,
        },
        "corpus": {
            "posts": len(posts),
            "tokens": len(all_ids),
        },
        "tokenization": {
            "keep_case": keep_case,
        },
    }
    with (out_dir / "meta.json").open("w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2, ensure_ascii=True)

    print(f"Saved checkpoint to {out_dir / 'model.pt'}")
    print(f"Saved metadata to {out_dir / 'meta.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
