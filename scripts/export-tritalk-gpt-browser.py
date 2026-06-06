from __future__ import annotations

import json
from pathlib import Path

import torch


REPO_ROOT = Path(__file__).resolve().parent.parent
CHECKPOINT_PATH = REPO_ROOT / "tritalk_gpt_v011" / "runs" / "v011-large" / "checkpoint.pt"
TOKENIZER_PATH = REPO_ROOT / "tritalk_gpt_v011" / "data" / "corpus_v011" / "tokenizer.json"
META_PATH = REPO_ROOT / "tritalk_gpt_v011" / "runs" / "v011-large" / "meta.json"
OUTPUT_DIR = REPO_ROOT / "assets" / "data"
OUTPUT_MANIFEST_PATH = OUTPUT_DIR / "tritalk-gpt-browser-model.json"
OUTPUT_WEIGHTS_PATH = OUTPUT_DIR / "tritalk-gpt-browser-model.bin"


def main() -> int:
    checkpoint = torch.load(CHECKPOINT_PATH, map_location="cpu")
    state_dict = checkpoint["model_state"] if "model_state" in checkpoint else checkpoint

    with TOKENIZER_PATH.open("r", encoding="utf-8") as handle:
        tokenizer = json.load(handle)
    with META_PATH.open("r", encoding="utf-8") as handle:
        meta = json.load(handle)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest_tensors: dict[str, dict] = {}
    byte_offset = 0

    with OUTPUT_WEIGHTS_PATH.open("wb") as weights_handle:
        for tensor_name, tensor_value in state_dict.items():
            if tensor_name.endswith(".mask"):
                continue

            array = tensor_value.detach().to(torch.float32).contiguous().numpy()
            payload = array.tobytes(order="C")
            weights_handle.write(payload)
            manifest_tensors[tensor_name] = {
                "dtype": "float32",
                "shape": list(array.shape),
                "byte_offset": byte_offset,
                "byte_length": len(payload),
            }
            byte_offset += len(payload)

    manifest = {
        "format": "nyberry-gpt-browser-v011",
        "checkpoint": "v011-large",
        "weights_file": OUTPUT_WEIGHTS_PATH.name,
        "config": meta["config"],
        "training": meta["training"],
        "corpus": meta["corpus"],
        "tokenization": meta["tokenization"],
        "tokenizer": tokenizer,
        "tensors": manifest_tensors,
    }

    with OUTPUT_MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)

    print(f"Wrote manifest to {OUTPUT_MANIFEST_PATH}")
    print(f"Wrote weights to {OUTPUT_WEIGHTS_PATH}")
    print(f"Total weight bytes: {byte_offset}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
