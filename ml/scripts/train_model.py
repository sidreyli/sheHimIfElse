"""
Train an LSTM-based ASL word classifier on hand landmark sequences.

Uses PyTorch instead of TensorFlow for broader Python version support.

Input:
  data/processed/sequences.npy  — shape (N, 32, 126)
  data/processed/labels.npy     — shape (N,)
  data/processed/label_map.json — index -> word mapping

Output:
  models/saved_model/asl_model.pth    — PyTorch state dict
  models/saved_model/asl_model.onnx   — ONNX export for browser conversion
  models/saved_model/label_map.json   — copy of label map
"""

import json
import shutil
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
DATA_DIR = PROJECT_DIR / "data" / "processed"
MODEL_DIR = PROJECT_DIR / "models" / "saved_model"

SEQ_LEN = 32
NUM_FEATURES = 126  # 42 hand landmarks × 3 coords


class ASLClassifier(nn.Module):
    """Bidirectional LSTM classifier for ASL hand landmark sequences."""

    def __init__(self, input_size: int, num_classes: int,
                 hidden_size: int = 128, num_layers: int = 2, dropout: float = 0.3):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout),
            nn.Linear(hidden_size * 2, 128),  # *2 for bidirectional
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq_len, features)
        lstm_out, _ = self.lstm(x)          # (batch, seq_len, hidden*2)
        last_hidden = lstm_out[:, -1, :]    # (batch, hidden*2)
        return self.classifier(last_hidden) # (batch, num_classes)


def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    # Load processed data
    X = np.load(DATA_DIR / "sequences.npy")   # (N, 32, 126)
    y = np.load(DATA_DIR / "labels.npy")       # (N,)

    with open(DATA_DIR / "label_map.json") as f:
        label_map = json.load(f)
    num_classes = len(label_map)

    print(f"Dataset: {X.shape[0]} samples")
    print(f"Sequence shape: {X.shape[1:]} (frames={SEQ_LEN}, features={NUM_FEATURES})")
    print(f"Classes: {num_classes}")

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"Train: {X_train.shape[0]}, Test: {X_test.shape[0]}")

    # Create DataLoaders
    train_ds = TensorDataset(
        torch.tensor(X_train, dtype=torch.float32),
        torch.tensor(y_train, dtype=torch.long),
    )
    test_ds = TensorDataset(
        torch.tensor(X_test, dtype=torch.float32),
        torch.tensor(y_test, dtype=torch.long),
    )
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=64)

    # Build model
    model = ASLClassifier(
        input_size=NUM_FEATURES,
        num_classes=num_classes,
    ).to(device)

    print(f"\nModel parameters: {sum(p.numel() for p in model.parameters()):,}")
    print(model)

    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, factor=0.5, patience=3, min_lr=1e-6
    )
    criterion = nn.CrossEntropyLoss()

    # Training loop
    best_acc = 0.0
    patience_counter = 0
    max_patience = 8

    for epoch in range(60):
        # Train
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for batch_x, batch_y in train_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)

            optimizer.zero_grad()
            logits = model(batch_x)
            loss = criterion(logits, batch_y)
            loss.backward()
            optimizer.step()

            train_loss += loss.item() * batch_x.size(0)
            train_correct += (logits.argmax(dim=1) == batch_y).sum().item()
            train_total += batch_x.size(0)

        train_loss /= train_total
        train_acc = train_correct / train_total

        # Evaluate
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        all_logits = []
        all_labels = []

        with torch.no_grad():
            for batch_x, batch_y in test_loader:
                batch_x, batch_y = batch_x.to(device), batch_y.to(device)
                logits = model(batch_x)
                loss = criterion(logits, batch_y)

                val_loss += loss.item() * batch_x.size(0)
                val_correct += (logits.argmax(dim=1) == batch_y).sum().item()
                val_total += batch_x.size(0)
                all_logits.append(logits.cpu())
                all_labels.append(batch_y.cpu())

        val_loss /= val_total
        val_acc = val_correct / val_total

        scheduler.step(val_loss)
        lr = optimizer.param_groups[0]["lr"]

        print(f"Epoch {epoch+1:2d} | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc:.4f} | "
              f"LR: {lr:.6f}")

        # Early stopping with best model tracking
        if val_acc > best_acc:
            best_acc = val_acc
            patience_counter = 0
            best_state = {k: v.clone() for k, v in model.state_dict().items()}
        else:
            patience_counter += 1
            if patience_counter >= max_patience:
                print(f"\nEarly stopping at epoch {epoch+1}")
                break

    # Restore best model
    model.load_state_dict(best_state)
    print(f"\nBest validation accuracy: {best_acc:.4f}")

    # Top-5 accuracy
    all_logits = torch.cat(all_logits)
    all_labels = torch.cat(all_labels)
    top5_preds = all_logits.topk(min(5, num_classes), dim=1).indices
    top5_correct = sum(
        label in preds for label, preds in zip(all_labels, top5_preds)
    )
    print(f"Top-5 accuracy: {top5_correct / len(all_labels):.4f}")

    # Save
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Save PyTorch model
    torch.save({
        "model_state_dict": model.state_dict(),
        "num_classes": num_classes,
        "seq_len": SEQ_LEN,
        "num_features": NUM_FEATURES,
    }, MODEL_DIR / "asl_model.pth")
    print(f"PyTorch model saved to {MODEL_DIR / 'asl_model.pth'}")

    # Export to ONNX for browser conversion
    model.eval()
    dummy_input = torch.randn(1, SEQ_LEN, NUM_FEATURES).to(device)
    onnx_path = MODEL_DIR / "asl_model.onnx"
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        },
        opset_version=17,
    )
    print(f"ONNX model saved to {onnx_path}")

    # Copy label map alongside model
    shutil.copy(DATA_DIR / "label_map.json", MODEL_DIR / "label_map.json")
    print("Label map copied to model directory")


if __name__ == "__main__":
    train()
