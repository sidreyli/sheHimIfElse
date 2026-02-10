"""Re-save the ONNX model with all weights embedded (no external .data file)."""
import os
from pathlib import Path
import onnx

SRC = Path(__file__).parent.parent / "models" / "saved_model" / "asl_model.onnx"
DST = Path(__file__).parent.parent / "models" / "saved_model" / "asl_model_embedded.onnx"

model = onnx.load(str(SRC), load_external_data=True)
onnx.save_model(model, str(DST), save_as_external_data=False)
size = os.path.getsize(DST)
print(f"Saved embedded model: {DST} ({size:,} bytes)")
