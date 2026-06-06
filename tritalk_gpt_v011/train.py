from __future__ import annotations

import argparse
import json
import math
import random
import time
from pathlib import Path

import torch

from .model import GPT, GPTConfig
from .tokenizer import BPETokenizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train TriTalk miniGPT v0.1.1.")
    parser.add_argument(
        "--input-dir",
        default="tritalk_gpt_v011/data/corpus_v011",
        help="Directory containing tokenizer.json, train_ids.pt, and val_ids.pt.",
    )
    parser.add_argument(
        "--out-dir",
        default="tritalk_gpt_v011/runs/v011-large",
        help="Directory for checkpoints and metadata.",
    )
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--block-size", type=int, default=128)
    parser.add_argument("--n-layer", type=int, default=6)
    parser.add_argument("--n-head", type=int, default=6)
    parser.add_argument("--n-embd", type=int, default=192)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--min-lr", type=float, default=3e-5)
    parser.add_argument("--warmup-steps", type=int, default=200)
    parser.add_argument("--weight-decay", type=float, default=0.01)
    parser.add_argument("--grad-clip", type=float, default=1.0)
    parser.add_argument("--max-steps", type=int, default=8000)
    parser.add_argument("--eval-interval", type=int, default=500)
    parser.add_argument("--eval-iters", type=int, default=50)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument(
        "--init-from",
        default="",
        help="Optional checkpoint path to resume from.",
    )
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


def lr_for_step(step: int, *, max_lr: float, min_lr: float, warmup_steps: int, max_steps: int) -> float:
    if warmup_steps > 0 and step <= warmup_steps:
        return max_lr * step / warmup_steps
    if step >= max_steps:
        return min_lr
    if max_steps <= warmup_steps:
        return min_lr
    progress = (step - warmup_steps) / (max_steps - warmup_steps)
    cosine = 0.5 * (1 + math.cos(math.pi * progress))
    return min_lr + cosine * (max_lr - min_lr)


def load_checkpoint(path: str | Path, device: str) -> dict:
    payload = torch.load(path, map_location=device)
    if isinstance(payload, dict) and "model_state" in payload:
        return payload
    return {"model_state": payload}


def main() -> int:
    args = parse_args()
    random.seed(args.seed)
    torch.manual_seed(args.seed)

    device = choose_device(args.device)
    input_dir = Path(args.input_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    tokenizer = BPETokenizer.load(input_dir / "tokenizer.json")
    train_data = torch.load(input_dir / "train_ids.pt", map_location="cpu").to(torch.long)
    val_data = torch.load(input_dir / "val_ids.pt", map_location="cpu").to(torch.long)

    if len(train_data) <= args.block_size + 1 or len(val_data) <= args.block_size + 1:
        raise ValueError("Need more encoded data or a smaller block size.")

    config = GPTConfig(
        vocab_size=len(tokenizer.vocab),
        block_size=args.block_size,
        n_layer=args.n_layer,
        n_head=args.n_head,
        n_embd=args.n_embd,
        dropout=args.dropout,
    )
    model = GPT(config).to(device)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        weight_decay=args.weight_decay,
    )

    start_step = 0
    best_val = float("inf")
    eval_history: list[dict[str, float | int]] = []
    if args.init_from:
        checkpoint = load_checkpoint(args.init_from, device)
        model.load_state_dict(checkpoint["model_state"])
        if "optimizer_state" in checkpoint:
            optimizer.load_state_dict(checkpoint["optimizer_state"])
        start_step = int(checkpoint.get("step", 0))
        best_val = float(checkpoint.get("best_val_loss", best_val))
        eval_history = list(checkpoint.get("eval_history", []))

    started_at = time.time()

    for step in range(start_step + 1, args.max_steps + 1):
        lr = lr_for_step(
            step,
            max_lr=args.learning_rate,
            min_lr=args.min_lr,
            warmup_steps=args.warmup_steps,
            max_steps=args.max_steps,
        )
        for group in optimizer.param_groups:
            group["lr"] = lr

        xb, yb = get_batch(
            train_data,
            batch_size=args.batch_size,
            block_size=args.block_size,
            device=device,
        )
        _, loss = model(xb, yb)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), args.grad_clip)
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
            eval_record = {
                "step": step,
                "train_loss": metrics["train"],
                "val_loss": metrics["val"],
                "learning_rate": lr,
            }
            eval_history.append(eval_record)
            print(
                f"step {step:5d} | "
                f"lr {lr:.6f} | "
                f"train loss {metrics['train']:.4f} | "
                f"val loss {metrics['val']:.4f}"
            )

            checkpoint_payload = {
                "model_state": model.state_dict(),
                "optimizer_state": optimizer.state_dict(),
                "step": step,
                "best_val_loss": best_val,
                "eval_history": eval_history,
                "config": {
                    "block_size": args.block_size,
                    "n_layer": args.n_layer,
                    "n_head": args.n_head,
                    "n_embd": args.n_embd,
                    "dropout": args.dropout,
                    "vocab_size": len(tokenizer.vocab),
                },
            }
            torch.save(checkpoint_payload, out_dir / "checkpoint.pt")

            if metrics["val"] < best_val:
                best_val = metrics["val"]
                checkpoint_payload["best_val_loss"] = best_val
                torch.save(checkpoint_payload, out_dir / "checkpoint.pt")
                torch.save(model.state_dict(), out_dir / "model.pt")

    wall_clock_seconds = time.time() - started_at
    processed_token_positions = args.max_steps * args.batch_size * args.block_size
    approx_epochs = processed_token_positions / len(train_data)

    meta = {
        "version": "0.1.1",
        "config": {
            "block_size": args.block_size,
            "n_layer": args.n_layer,
            "n_head": args.n_head,
            "n_embd": args.n_embd,
            "dropout": args.dropout,
            "vocab_size": len(tokenizer.vocab),
        },
        "training": {
            "batch_size": args.batch_size,
            "learning_rate": args.learning_rate,
            "min_lr": args.min_lr,
            "warmup_steps": args.warmup_steps,
            "weight_decay": args.weight_decay,
            "grad_clip": args.grad_clip,
            "max_steps": args.max_steps,
            "device": device,
            "seed": args.seed,
            "best_val_loss": best_val,
            "wall_clock_seconds": wall_clock_seconds,
            "approx_epochs": approx_epochs,
            "processed_token_positions": processed_token_positions,
        },
        "corpus": {
            "train_tokens": int(len(train_data)),
            "val_tokens": int(len(val_data)),
            "vocab_size": len(tokenizer.vocab),
        },
        "tokenization": {
            "type": "bpe-subword",
            "lowercase": tokenizer.lowercase,
            "learned_merges": len(tokenizer.merges),
        },
        "eval_history": eval_history,
    }

    with (out_dir / "meta.json").open("w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2, ensure_ascii=False)

    print(f"Saved checkpoint to {out_dir / 'checkpoint.pt'}")
    print(f"Saved best weights to {out_dir / 'model.pt'}")
    print(f"Saved metadata to {out_dir / 'meta.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
