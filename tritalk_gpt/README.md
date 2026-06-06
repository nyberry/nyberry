# TriTalk miniGPT

This folder contains a small, self-contained GPT-style language model workflow inspired by Andrej Karpathy's `minGPT`, but trained on word sequences from posts on `tritalk.co.uk`.

## What it does

1. Downloads public forum posts from TriTalk's Discourse API.
2. Cleans the post text into a word-level corpus.
3. Trains a small decoder-only transformer to predict the next word.
4. Samples text from the trained model.

## Why this is different from the "names list" examples

Karpathy's early educational examples often learn from a simple list of names or from character-level text. This project instead:

- uses forum post text from `https://forum.tritalk.co.uk`
- tokenizes at the word level instead of the character level
- learns next-word prediction from real post sequences

## Install

Create a virtual environment if you want to keep dependencies isolated:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tritalk_gpt/requirements.txt
```

## 1. Fetch posts

This downloads recent topics and writes one cleaned post per JSON line:

```bash
python3 -m tritalk_gpt.fetch \
  --pages 3 \
  --max-topics 60 \
  --max-posts-per-topic 120 \
  --output tritalk_gpt/data/posts.jsonl
```

Notes:

- `--pages` controls how many `latest.json` pages are scanned.
- `--max-posts-per-topic 0` means "no cap".
- very large forum threads can dominate the corpus, so the cap is useful

## 2. Prepare a word corpus

```bash
python3 -m tritalk_gpt.prepare \
  --input tritalk_gpt/data/posts.jsonl \
  --output-dir tritalk_gpt/data/corpus \
  --min-frequency 2
```

This creates:

- `posts.txt`: one tokenized post per line
- `vocab.json`: token counts and vocabulary metadata
- `stats.json`: corpus summary

## 3. Train the model

```bash
python3 -m tritalk_gpt.train \
  --input tritalk_gpt/data/corpus/posts.txt \
  --out-dir tritalk_gpt/runs/tritalk-small \
  --batch-size 32 \
  --block-size 64 \
  --n-layer 4 \
  --n-head 4 \
  --n-embd 128 \
  --max-steps 2500
```

Outputs:

- `model.pt`: trained weights
- `meta.json`: vocabulary and config required for sampling

## 4. Sample from the model

```bash
python3 -m tritalk_gpt.sample \
  --checkpoint tritalk_gpt/runs/tritalk-small/model.pt \
  --meta tritalk_gpt/runs/tritalk-small/meta.json \
  --prompt "ironman bike split" \
  --max-new-tokens 40 \
  --temperature 0.9
```

## Sensible first settings

If you are running on CPU only, start small:

- `--pages 2`
- `--max-topics 40`
- `--max-posts-per-topic 80`
- `--n-layer 4`
- `--n-head 4`
- `--n-embd 128`
- `--block-size 64`
- `--max-steps 1000`

## Important caveats

- This uses publicly visible forum content, but you should still be thoughtful about reuse and redistribution.
- A word-level model is easy to understand but less flexible than BPE tokenization.
- The generated text may reproduce forum-like phrasing and opinions from the training data.
