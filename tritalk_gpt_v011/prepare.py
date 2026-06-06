from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

import torch

from tritalk_gpt.text import read_jsonl

from .tokenizer import BPETokenizer


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare a subword TriTalk corpus.")
    parser.add_argument(
        "--input",
        default="tritalk_gpt_v011/data/posts_large.jsonl",
        help="Input JSONL file containing forum posts.",
    )
    parser.add_argument(
        "--output-dir",
        default="tritalk_gpt_v011/data/corpus_v011",
        help="Directory for tokenizer and encoded datasets.",
    )
    parser.add_argument("--vocab-size", type=int, default=2048)
    parser.add_argument("--min-pair-frequency", type=int, default=2)
    parser.add_argument("--val-ratio", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=1337)
    parser.add_argument(
        "--keep-case",
        action="store_true",
        help="Keep case instead of lowercasing during tokenization.",
    )
    parser.add_argument(
        "--disable-dedupe",
        action="store_true",
        help="Keep exact duplicate post texts.",
    )
    return parser.parse_args()


def dedupe_posts(texts: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for text in texts:
        key = text.strip()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(text)
    return unique


def encode_posts(texts: list[str], tokenizer: BPETokenizer) -> tuple[list[int], int]:
    bos_id = tokenizer.stoi["<bos>"]
    eos_id = tokenizer.stoi["<eos>"]
    all_ids: list[int] = []
    piece_count = 0

    for text in texts:
        ids = tokenizer.encode_ids(text)
        if not ids:
            continue
        all_ids.append(bos_id)
        all_ids.extend(ids)
        all_ids.append(eos_id)
        piece_count += len(ids)

    return all_ids, piece_count


def main() -> int:
    args = parse_args()
    random.seed(args.seed)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = read_jsonl(args.input)
    texts = [row.get("text", "").strip() for row in rows if row.get("text", "").strip()]
    raw_posts = len(texts)
    if not args.disable_dedupe:
        texts = dedupe_posts(texts)

    random.shuffle(texts)
    split_index = max(1, int(len(texts) * (1 - args.val_ratio)))
    train_texts = texts[:split_index]
    val_texts = texts[split_index:]
    if not val_texts:
        raise ValueError("Validation split is empty. Add more posts or lower --val-ratio.")

    tokenizer, tokenizer_stats = BPETokenizer.train(
        train_texts,
        vocab_size=args.vocab_size,
        min_pair_frequency=args.min_pair_frequency,
        lowercase=not args.keep_case,
    )
    tokenizer.save(output_dir / "tokenizer.json")

    train_ids, train_piece_count = encode_posts(train_texts, tokenizer)
    val_ids, val_piece_count = encode_posts(val_texts, tokenizer)

    torch.save(torch.tensor(train_ids, dtype=torch.long), output_dir / "train_ids.pt")
    torch.save(torch.tensor(val_ids, dtype=torch.long), output_dir / "val_ids.pt")

    with (output_dir / "train_posts.txt").open("w", encoding="utf-8") as handle:
        for text in train_texts:
            handle.write(text.replace("\n", " ").strip() + "\n")

    with (output_dir / "val_posts.txt").open("w", encoding="utf-8") as handle:
        for text in val_texts:
            handle.write(text.replace("\n", " ").strip() + "\n")

    stats = {
        "version": "0.1.1",
        "raw_posts": raw_posts,
        "deduped_posts": len(texts),
        "train_posts": len(train_texts),
        "val_posts": len(val_texts),
        "train_subword_tokens": train_piece_count,
        "val_subword_tokens": val_piece_count,
        "tokenizer": {
            "vocab_size": len(tokenizer.vocab),
            "min_pair_frequency": args.min_pair_frequency,
            "keep_case": args.keep_case,
            **tokenizer_stats,
        },
        "split": {
            "val_ratio": args.val_ratio,
            "seed": args.seed,
            "post_level_split": True,
            "exact_deduped": not args.disable_dedupe,
        },
    }

    with (output_dir / "stats.json").open("w", encoding="utf-8") as handle:
        json.dump(stats, handle, indent=2, ensure_ascii=False)

    print(json.dumps(stats, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
