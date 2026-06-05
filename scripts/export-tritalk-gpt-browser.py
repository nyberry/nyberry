from __future__ import annotations

import json
from pathlib import Path

import torch


REPO_ROOT = Path(__file__).resolve().parent.parent
CHECKPOINT_PATH = REPO_ROOT / "tritalk_gpt" / "runs" / "tritalk-minfreq1" / "model.pt"
META_PATH = REPO_ROOT / "tritalk_gpt" / "runs" / "tritalk-minfreq1" / "meta.json"
OUTPUT_MANIFEST_PATH = REPO_ROOT / "assets" / "data" / "tritalk-gpt-browser-model.json"
OUTPUT_WEIGHTS_PATH = REPO_ROOT / "assets" / "data" / "tritalk-gpt-browser-model.bin"
SKIP_TENSORS = {
    "blocks.0.attn.mask",
    "blocks.1.attn.mask",
    "blocks.2.attn.mask",
    "blocks.3.attn.mask",
}


def main() -> int:
    state_dict = torch.load(CHECKPOINT_PATH, map_location="cpu")
    with META_PATH.open("r", encoding="utf-8") as handle:
        meta = json.load(handle)

    OUTPUT_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    manifest_tensors: dict[str, dict] = {}
    byte_offset = 0

    with OUTPUT_WEIGHTS_PATH.open("wb") as weights_handle:
        for tensor_name, tensor_value in state_dict.items():
            if tensor_name in SKIP_TENSORS:
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
        "format": "nyberry-gpt-browser-v1",
        "checkpoint": "tritalk-minfreq1",
        "weights_file": OUTPUT_WEIGHTS_PATH.name,
        "config": meta["config"],
        "training": meta["training"],
        "tokenization": meta.get("tokenization", {"keep_case": False}),
        "special_tokens": {
            "pad": "<pad>",
            "bos": "<bos>",
            "eos": "<eos>",
            "unk": "<unk>",
        },
        "vocab": meta["vocab"],
        "tensors": manifest_tensors,
    }

    with OUTPUT_MANIFEST_PATH.open("w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=True)

    print(f"Wrote manifest to {OUTPUT_MANIFEST_PATH}")
    print(f"Wrote weights to {OUTPUT_WEIGHTS_PATH}")
    print(f"Total weight bytes: {byte_offset}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
