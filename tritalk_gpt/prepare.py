from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from .text import read_jsonl, tokenize_words


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare a word-level corpus.")
    parser.add_argument(
        "--input",
        default="tritalk_gpt/data/posts.jsonl",
        help="Input JSONL file from tritalk_gpt.fetch.",
    )
    parser.add_argument(
        "--output-dir",
        default="tritalk_gpt/data/corpus",
        help="Directory for prepared corpus files.",
    )
    parser.add_argument(
        "--min-frequency",
        type=int,
        default=2,
        help="Minimum token frequency to include in vocab statistics.",
    )
    parser.add_argument(
        "--keep-case",
        action="store_true",
        help="Keep original casing instead of lowercasing tokens.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    posts = read_jsonl(args.input)
    token_counter: Counter[str] = Counter()
    tokenized_posts: list[list[str]] = []

    for post in posts:
        tokens = tokenize_words(post.get("text", ""), lowercase=not args.keep_case)
        if not tokens:
            continue
        token_counter.update(tokens)
        tokenized_posts.append(tokens)

    posts_path = output_dir / "posts.txt"
    with posts_path.open("w", encoding="utf-8") as handle:
        for tokens in tokenized_posts:
            handle.write(" ".join(tokens) + "\n")

    vocab = {
        "special_tokens": ["<pad>", "<bos>", "<eos>", "<unk>"],
        "min_frequency": args.min_frequency,
        "keep_case": args.keep_case,
        "vocab": [
            token
            for token, count in token_counter.most_common()
            if count >= args.min_frequency
        ],
        "counts": {
            token: count
            for token, count in token_counter.most_common()
            if count >= args.min_frequency
        },
    }
    with (output_dir / "vocab.json").open("w", encoding="utf-8") as handle:
        json.dump(vocab, handle, indent=2, ensure_ascii=True)

    stats = {
        "posts": len(tokenized_posts),
        "total_tokens": sum(len(tokens) for tokens in tokenized_posts),
        "unique_tokens": len(token_counter),
        "tokens_meeting_min_frequency": len(vocab["vocab"]),
        "keep_case": args.keep_case,
        "min_frequency": args.min_frequency,
    }
    with (output_dir / "stats.json").open("w", encoding="utf-8") as handle:
        json.dump(stats, handle, indent=2, ensure_ascii=True)

    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
