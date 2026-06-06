from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

from tritalk_gpt.text import tokenize_words

SPACE_MARKER = "▁"
SPECIAL_TOKENS = ["<pad>", "<bos>", "<eos>", "<unk>"]


def merge_token_symbols(symbols: tuple[str, ...], pair: tuple[str, str]) -> tuple[str, ...]:
    merged: list[str] = []
    index = 0
    pair_token = pair[0] + pair[1]
    while index < len(symbols):
        if index < len(symbols) - 1 and symbols[index] == pair[0] and symbols[index + 1] == pair[1]:
            merged.append(pair_token)
            index += 2
        else:
            merged.append(symbols[index])
            index += 1
    return tuple(merged)


@dataclass
class BPETokenizer:
    merges: list[list[str]]
    vocab: list[str]
    lowercase: bool = True
    min_pair_frequency: int = 2

    def __post_init__(self) -> None:
        self.special_tokens = list(SPECIAL_TOKENS)
        self.merge_ranks = {
            (pair[0], pair[1]): index for index, pair in enumerate(self.merges)
        }
        self.stoi = {token: index for index, token in enumerate(self.vocab)}
        self._cache: dict[str, list[str]] = {}

    @classmethod
    def train(
        cls,
        texts: list[str],
        *,
        vocab_size: int,
        min_pair_frequency: int = 2,
        lowercase: bool = True,
    ) -> tuple["BPETokenizer", dict[str, int]]:
        token_counter: Counter[str] = Counter()
        for text in texts:
            token_counter.update(tokenize_words(text, lowercase=lowercase))

        word_freq: Counter[tuple[str, ...]] = Counter()
        for token, count in token_counter.items():
            if token:
                word_freq[tuple([SPACE_MARKER, *list(token)])] = count

        merges: list[list[str]] = []
        base_symbols = {symbol for symbols in word_freq for symbol in symbols}
        max_merges = max(0, vocab_size - len(SPECIAL_TOKENS) - len(base_symbols))
        current_vocab = Counter(word_freq)

        for _ in range(max_merges):
            pair_counts: Counter[tuple[str, str]] = Counter()
            for symbols, count in current_vocab.items():
                for index in range(len(symbols) - 1):
                    pair_counts[(symbols[index], symbols[index + 1])] += count

            if not pair_counts:
                break

            best_pair, best_count = pair_counts.most_common(1)[0]
            if best_count < min_pair_frequency:
                break

            merges.append([best_pair[0], best_pair[1]])
            updated_vocab: Counter[tuple[str, ...]] = Counter()
            for symbols, count in current_vocab.items():
                updated_vocab[merge_token_symbols(symbols, best_pair)] += count
            current_vocab = updated_vocab

        tokenizer = cls(
            merges=merges,
            vocab=list(SPECIAL_TOKENS),
            lowercase=lowercase,
            min_pair_frequency=min_pair_frequency,
        )

        piece_counter: Counter[str] = Counter()
        for text in texts:
            piece_counter.update(tokenizer.encode_to_pieces(text))

        tokenizer.vocab = list(SPECIAL_TOKENS)
        tokenizer.vocab.extend(piece for piece, _ in piece_counter.most_common())
        tokenizer.stoi = {token: index for index, token in enumerate(tokenizer.vocab)}

        stats = {
            "unique_input_tokens": len(token_counter),
            "learned_merges": len(merges),
            "subword_vocab_size": len(tokenizer.vocab),
        }
        return tokenizer, stats

    def encode_token(self, token: str) -> list[str]:
        if token in self._cache:
            return list(self._cache[token])

        symbols = list([SPACE_MARKER, *list(token)])

        while len(symbols) >= 2:
            best_rank: int | None = None
            best_pair: tuple[str, str] | None = None
            for index in range(len(symbols) - 1):
                pair = (symbols[index], symbols[index + 1])
                rank = self.merge_ranks.get(pair)
                if rank is None:
                    continue
                if best_rank is None or rank < best_rank:
                    best_rank = rank
                    best_pair = pair

            if best_pair is None:
                break

            merged: list[str] = []
            index = 0
            merged_token = best_pair[0] + best_pair[1]
            while index < len(symbols):
                if (
                    index < len(symbols) - 1
                    and symbols[index] == best_pair[0]
                    and symbols[index + 1] == best_pair[1]
                ):
                    merged.append(merged_token)
                    index += 2
                else:
                    merged.append(symbols[index])
                    index += 1
            symbols = merged

        self._cache[token] = list(symbols)
        return list(symbols)

    def encode_to_pieces(self, text: str) -> list[str]:
        pieces: list[str] = []
        for token in tokenize_words(text, lowercase=self.lowercase):
            pieces.extend(self.encode_token(token))
        return pieces

    def encode_ids(self, text: str) -> list[int]:
        unk_id = self.stoi["<unk>"]
        return [self.stoi.get(piece, unk_id) for piece in self.encode_to_pieces(text)]

    def decode_pieces(self, pieces: list[str]) -> str:
        text = "".join(
            piece for piece in pieces if piece not in set(self.special_tokens)
        )
        text = text.replace(SPACE_MARKER, " ")
        text = re.sub(r"\s+([.,!?;:)\]])", r"\1", text)
        text = re.sub(r"([(\[])\s+", r"\1", text)
        text = re.sub(r"\s+", " ", text)
        return text.strip()

    def decode_ids(self, ids: list[int]) -> str:
        pieces = [
            self.vocab[token_id]
            for token_id in ids
            if 0 <= token_id < len(self.vocab) and self.vocab[token_id] not in {"<pad>", "<bos>"}
        ]
        if "<eos>" in pieces:
            pieces = pieces[: pieces.index("<eos>")]
        return self.decode_pieces(pieces)

    def to_dict(self) -> dict:
        return {
            "version": "0.1.1",
            "lowercase": self.lowercase,
            "min_pair_frequency": self.min_pair_frequency,
            "space_marker": SPACE_MARKER,
            "special_tokens": list(SPECIAL_TOKENS),
            "merges": self.merges,
            "vocab": self.vocab,
        }

    def save(self, path: str | Path) -> None:
        with Path(path).open("w", encoding="utf-8") as handle:
            json.dump(self.to_dict(), handle, indent=2, ensure_ascii=False)

    @classmethod
    def load(cls, path: str | Path) -> "BPETokenizer":
        with Path(path).open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return cls(
            merges=payload["merges"],
            vocab=payload["vocab"],
            lowercase=bool(payload.get("lowercase", True)),
            min_pair_frequency=int(payload.get("min_pair_frequency", 2)),
        )
