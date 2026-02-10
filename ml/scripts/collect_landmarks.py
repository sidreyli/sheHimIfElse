"""
Process the Kaggle ASL Signs dataset (parquet landmark files) into
fixed-length sequences for training.

Input:
  data/asl-signs/train.csv
  data/asl-signs/train_landmark_files/{participant_id}/{sequence_id}.parquet
  data/asl-signs/sign_to_prediction_index_map.json

Output:
  data/processed/sequences.npy    — shape (N, SEQ_LEN, NUM_FEATURES)
  data/processed/labels.npy       — shape (N,) integer class indices
  data/processed/label_map.json   — { "hello": 0, "book": 1, ... }
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data" / "asl-signs"
OUTPUT_DIR = PROJECT_DIR / "data" / "processed"

TRAIN_CSV = DATA_DIR / "train.csv"
LANDMARK_DIR = DATA_DIR / "train_landmark_files"
SIGN_MAP_FILE = DATA_DIR / "sign_to_prediction_index_map.json"

# We only use hand landmarks (left_hand + right_hand = 42 landmarks × 3 coords = 126 features)
HAND_LANDMARK_TYPES = {"left_hand", "right_hand"}
LANDMARKS_PER_HAND = 21
FEATURES_PER_FRAME = LANDMARKS_PER_HAND * 2 * 3  # 126

# Fixed sequence length — pad or truncate all sequences to this
SEQ_LEN = 32

# Max samples per sign (to keep dataset balanced and manageable)
MAX_SAMPLES_PER_SIGN = 500


def load_parquet_hand_landmarks(parquet_path: Path) -> np.ndarray | None:
    """
    Load a single parquet file and extract hand landmark sequences.
    Returns shape (num_frames, 126) or None if no hand data.
    """
    try:
        df = pd.read_parquet(parquet_path)
    except Exception:
        return None

    # Filter to hand landmarks only
    hand_df = df[df["type"].isin(HAND_LANDMARK_TYPES)]
    if hand_df.empty:
        return None

    frames = sorted(hand_df["frame"].unique())
    num_frames = len(frames)
    if num_frames < 3:
        return None

    sequence = np.zeros((num_frames, FEATURES_PER_FRAME), dtype=np.float32)

    for i, frame_num in enumerate(frames):
        frame_data = hand_df[hand_df["frame"] == frame_num]

        for _, row in frame_data.iterrows():
            lm_type = row["type"]
            lm_idx = int(row["landmark_index"])

            # left_hand landmarks go to indices 0-62, right_hand to 63-125
            offset = 0 if lm_type == "left_hand" else LANDMARKS_PER_HAND * 3
            base = offset + lm_idx * 3

            if base + 2 < FEATURES_PER_FRAME:
                sequence[i, base] = row["x"] if not np.isnan(row["x"]) else 0.0
                sequence[i, base + 1] = row["y"] if not np.isnan(row["y"]) else 0.0
                sequence[i, base + 2] = row["z"] if not np.isnan(row["z"]) else 0.0

    return sequence


def pad_or_truncate(sequence: np.ndarray, target_len: int) -> np.ndarray:
    """Pad with zeros or uniformly sample to reach target_len frames."""
    n = sequence.shape[0]
    if n == target_len:
        return sequence
    if n > target_len:
        # Uniformly sample frames to keep temporal spread
        indices = np.linspace(0, n - 1, target_len, dtype=int)
        return sequence[indices]
    # Pad with zeros at the end
    pad = np.zeros((target_len - n, sequence.shape[1]), dtype=np.float32)
    return np.vstack([sequence, pad])


def process_dataset():
    if not TRAIN_CSV.exists():
        print(f"train.csv not found at {TRAIN_CSV}")
        print("Download the dataset first:")
        print("  kaggle competitions download -c asl-signs")
        print("  Unzip to ml/data/asl-signs/")
        sys.exit(1)

    # Load metadata
    train_df = pd.read_csv(TRAIN_CSV)
    print(f"Total samples in train.csv: {len(train_df)}")

    # Load sign-to-index mapping
    with open(SIGN_MAP_FILE) as f:
        sign_map = json.load(f)
    num_classes = len(sign_map)
    print(f"Number of signs/words: {num_classes}")

    # Count per sign for balancing
    sign_counts: dict[str, int] = {}

    all_sequences = []
    all_labels = []
    skipped = 0

    for idx, row in train_df.iterrows():
        sign = row["sign"]
        if sign not in sign_map:
            skipped += 1
            continue

        # Balance: limit samples per sign
        sign_counts[sign] = sign_counts.get(sign, 0)
        if sign_counts[sign] >= MAX_SAMPLES_PER_SIGN:
            continue

        # Build parquet path
        parquet_path = LANDMARK_DIR / str(row["participant_id"]) / f"{row['sequence_id']}.parquet"
        if not parquet_path.exists():
            skipped += 1
            continue

        sequence = load_parquet_hand_landmarks(parquet_path)
        if sequence is None:
            skipped += 1
            continue

        # Normalize to fixed length
        sequence = pad_or_truncate(sequence, SEQ_LEN)

        all_sequences.append(sequence)
        all_labels.append(sign_map[sign])
        sign_counts[sign] += 1

        if (idx + 1) % 2000 == 0:
            print(f"  Processed {idx + 1}/{len(train_df)} "
                  f"({len(all_sequences)} kept, {skipped} skipped)")

    # Convert to arrays
    X = np.array(all_sequences, dtype=np.float32)  # (N, SEQ_LEN, 126)
    y = np.array(all_labels, dtype=np.int32)        # (N,)

    print(f"\nFinal dataset: {X.shape[0]} samples")
    print(f"  Sequence shape: {X.shape}")
    print(f"  Labels shape: {y.shape}")
    print(f"  Skipped: {skipped}")
    print(f"  Signs with data: {len(sign_counts)}/{num_classes}")

    # Save
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    np.save(OUTPUT_DIR / "sequences.npy", X)
    np.save(OUTPUT_DIR / "labels.npy", y)

    # Save label map (index -> word) for the client
    index_to_sign = {v: k for k, v in sign_map.items()}
    with open(OUTPUT_DIR / "label_map.json", "w") as f:
        json.dump(index_to_sign, f, indent=2)

    print(f"\nSaved to {OUTPUT_DIR}/")
    print(f"  sequences.npy: {X.nbytes / 1024 / 1024:.1f} MB")
    print(f"  labels.npy")
    print(f"  label_map.json")


if __name__ == "__main__":
    process_dataset()
