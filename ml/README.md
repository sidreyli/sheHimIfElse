# ASL Recognition ML Pipeline

## Setup
```bash
cd ml
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
```

## Pipeline
1. **Data Collection**: Place ASL images in `data/raw/` organized by letter folder (A-Z)
2. **Landmark Extraction**: `python scripts/collect_landmarks.py` — extracts hand landmarks to CSV
3. **Training**: `python scripts/train_model.py` — trains classifier on landmarks
4. **Export**: `python scripts/convert_to_tfjs.py` — converts to TFJS and copies to client

## Notebooks
- `01_data_collection.ipynb` — Interactive data collection and exploration
- `02_training.ipynb` — Model training with visualization
- `03_export_tfjs.ipynb` — Export and validation
