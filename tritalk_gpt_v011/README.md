# TriTalk miniGPT v0.1.1

This folder is a local-only follow-on to the public browser demo.

The goals for `v0.1.1` are:

- train on more TriTalk posts
- switch from word-level tokens to subword tokens
- split train and validation data by post, not by a single long token stream
- support longer training runs and cleaner checkpointing

## Why this version exists

The public demo is intentionally tiny and browser-friendly.

That was useful as a proof of concept, but it has clear quality limits:

- word-level tokenization is brittle
- the vocabulary gets large quickly
- rare words are handled poorly
- the validation split is not as clean as it should be

This version keeps the same broad GPT idea but improves the local training pipeline.

## Suggested workflow

### 1. Fetch a larger corpus

You can still use the original fetcher:

```bash
python3 -m tritalk_gpt.fetch \
  --pages 8 \
  --max-topics 180 \
  --max-posts-per-topic 0 \
  --delay-seconds 0.2 \
  --output tritalk_gpt_v011/data/posts_large.jsonl
```

### 2. Prepare the subword corpus

```bash
python3 -m tritalk_gpt_v011.prepare \
  --input tritalk_gpt_v011/data/posts_large.jsonl \
  --output-dir tritalk_gpt_v011/data/corpus_v011 \
  --vocab-size 2048 \
  --min-pair-frequency 2
```

### 3. Train

```bash
python3 -m tritalk_gpt_v011.train \
  --input-dir tritalk_gpt_v011/data/corpus_v011 \
  --out-dir tritalk_gpt_v011/runs/v011-large \
  --batch-size 24 \
  --block-size 128 \
  --n-layer 6 \
  --n-head 6 \
  --n-embd 192 \
  --max-steps 8000
```

### 4. Sample

```bash
python3 -m tritalk_gpt_v011.sample \
  --checkpoint tritalk_gpt_v011/runs/v011-large/checkpoint.pt \
  --tokenizer tritalk_gpt_v011/data/corpus_v011/tokenizer.json \
  --prompt "swim training"
```

## Expectations

This should be better than the browser demo, but "an order of magnitude better"
is a quality goal rather than a guaranteed metric outcome.

The main reasons to expect improvement are:

- more data
- cleaner evaluation
- subword tokenization
- longer training
- slightly larger default model
