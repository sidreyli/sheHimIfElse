"""
Landmark configuration for TheoViel DeBERTa ASL model.

Maps 543 MediaPipe holistic landmarks -> 100 kept landmarks (95 selected + 5 averaged).
Mirrors client/src/features/asl/models/labelMap.ts — keep in sync.
"""

import numpy as np

# Indices into the 543-point MediaPipe holistic coordinate space.
# Order: pose 0-32, face 33-500(468 mesh pts offset by 33 in holistic), left hand 468-488, right hand 522-542 (but below are raw holistic indices).
KEPT_LANDMARKS = [
    # 0: left hand  (21 pts) — type 1
    [468, 469, 470, 471, 472, 473, 474, 475, 476, 477,
     478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488],
    # 1: right hand (21 pts) — type 2
    [522, 523, 524, 525, 526, 527, 528, 529, 530, 531,
     532, 533, 534, 535, 536, 537, 538, 539, 540, 541, 542],
    # 2: silhouette (18 pts) — type 3
    [10, 54, 67, 132, 150, 152, 162, 172, 176, 234,
     284, 297, 361, 379, 389, 397, 400, 454],
    # 3: lips (21 pts) — type 4
    [13, 37, 40, 61, 78, 81, 84, 87, 88, 91,
     191, 267, 270, 291, 308, 311, 314, 317, 318, 321, 415],
    # 4: arms (12 pts) — type 5
    [500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511],
    # 5: cheeks (2 pts) — type 6
    [205, 425],
]

# Type ID per group (1-indexed; 0 = padding in the model's Embedding layer)
MAPPING = [1, 2, 3, 4, 5, 6]

# Holistic indices to average into 5 virtual landmarks (appended after the 95 kept).
# All 5 receive type 6 (last MAPPING value) per TheoViel's preprocessing.
TO_AVG = [
    [466, 387, 385, 398, 263, 390, 374, 381, 362],  # left eye
    [246, 160, 158, 173,  33, 163, 145, 154, 133],  # right eye
    [383, 293, 296, 285],                            # left eyebrow
    [156,  63,  66,  55],                            # right eyebrow
    [1, 2, 98, 327, 168],                            # nose
]

# Flat list of all 95 kept holistic indices
KEPT_FLAT = np.concatenate(KEPT_LANDMARKS).tolist()          # len 95
N_KEPT = len(KEPT_FLAT)                                       # 95
N_AVG = len(TO_AVG)                                           # 5
N_LANDMARKS = N_KEPT + N_AVG                                  # 100

# Build the 100-element type array
TYPE_ARRAY: list[int] = []
for group, tid in zip(KEPT_LANDMARKS, MAPPING):
    TYPE_ARRAY.extend([tid] * len(group))
# Averaged landmarks get the last mapping value (6)
TYPE_ARRAY.extend([MAPPING[-1]] * N_AVG)
assert len(TYPE_ARRAY) == N_LANDMARKS

# Model constants (distilled config: logs/2023-04-30/7)
SEQ_LEN = 25
NUM_FEATURES = 5          # [type, x, y, z, landmark_id]
NUM_CLASSES = 250
EMBED_DIM = 16
DENSE_DIM = 192
TRANSFO_DIM = 768
TRANSFO_HEADS = 16
TRANSFO_LAYERS = 3
