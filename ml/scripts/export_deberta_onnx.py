"""
Export TheoViel's distilled DeBERTa ASL model to ONNX for browser inference.

Usage:
    python export_deberta_onnx.py <path_to_weights.pt>

Example:
    # 1. Clone the TheoViel repo and grab the weights:
    #    git clone https://github.com/TheoViel/kaggle_islr.git /tmp/kaggle_islr
    #    (or download mlp_bert_3_distilled_fullfit_0.pt from logs/2023-04-30/7/)
    #
    # 2. Run export:
    python export_deberta_onnx.py /tmp/kaggle_islr/logs/2023-04-30/7/mlp_bert_3_distilled_fullfit_0.pt

Output:  models/saved_model/asl_deberta.onnx
"""

import sys
import math
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.nn import LayerNorm

# ---------------------------------------------------------------------------
# DeBERTa layers (stripped from TheoViel's tflite/deberta.py — nobuco removed)
# ---------------------------------------------------------------------------

def _shape(x):
    """Replacement for nobuco.shape — just returns the actual shape tuple."""
    return tuple(x.shape)


class DebertaV2SelfOutput(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config["hidden_size"], config["hidden_size"])
        self.LayerNorm = LayerNorm(config["hidden_size"], config["layer_norm_eps"])

    def forward(self, hidden_states, input_tensor):
        hidden_states = self.dense(hidden_states)
        hidden_states = self.LayerNorm(hidden_states + input_tensor)
        return hidden_states


class Selector(nn.Module):
    def forward(self, x, ids):
        return torch.gather(x, 0, ids.long())


class DisentangledSelfAttention(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.num_attention_heads = config["num_attention_heads"]
        self.attention_head_size = config["hidden_size"] // self.num_attention_heads
        self.all_head_size = self.num_attention_heads * self.attention_head_size

        self.query_proj = nn.Linear(config["hidden_size"], self.all_head_size, bias=True)
        self.key_proj = nn.Linear(config["hidden_size"], self.all_head_size, bias=True)
        self.value_proj = nn.Linear(config["hidden_size"], self.all_head_size, bias=True)

        self.relative_attention = config.get("relative_attention", False)
        self.pos_att_type = config.get("pos_att_type", [])
        self.share_att_key = config.get("share_att_key", False)
        self.position_buckets = config.get("position_buckets", -1)
        self.max_relative_positions = config.get("max_relative_positions", -1)
        self.pos_ebd_size = self.position_buckets if self.position_buckets > 0 else self.max_relative_positions

        if self.relative_attention and not self.share_att_key:
            if "c2p" in self.pos_att_type:
                self.pos_key_proj = nn.Linear(config["hidden_size"], self.all_head_size, bias=True)
            if "p2c" in self.pos_att_type:
                self.pos_query_proj = nn.Linear(config["hidden_size"], self.all_head_size)

        self.scale_mult = torch.tensor(self.attention_head_size, dtype=torch.float)
        self.selector = Selector()

    def transpose_for_scores(self, x, attention_heads):
        new_x_shape = _shape(x)[:-1] + (attention_heads, -1)
        x = x.view(new_x_shape)
        return x.permute(0, 2, 1, 3).contiguous().view(-1, _shape(x)[1], _shape(x)[-1])

    def forward(self, hidden_states, rel_embeddings=None, ids=None, ids_t=None, **kwargs):
        query_layer = self.transpose_for_scores(self.query_proj(hidden_states), self.num_attention_heads)
        key_layer = self.transpose_for_scores(self.key_proj(hidden_states), self.num_attention_heads)
        value_layer = self.transpose_for_scores(self.value_proj(hidden_states), self.num_attention_heads)

        scale_factor = 1
        if "c2p" in self.pos_att_type:
            scale_factor += 1
        if "p2c" in self.pos_att_type:
            scale_factor += 1
        scale = torch.sqrt(self.scale_mult * scale_factor)

        attention_scores = torch.bmm(query_layer, key_layer.transpose(-1, -2)) / scale

        if self.relative_attention and rel_embeddings is not None:
            rel_att = self._disentangled_bias(query_layer, key_layer, rel_embeddings, scale_factor, ids, ids_t)
            if rel_att is not None:
                attention_scores = attention_scores + rel_att

        attention_scores = attention_scores.view(-1, self.num_attention_heads, _shape(attention_scores)[-2], _shape(attention_scores)[-1])
        attention_probs = torch.softmax(attention_scores, -1)

        context_layer = torch.bmm(
            attention_probs.view(-1, _shape(attention_probs)[-2], _shape(attention_probs)[-1]),
            value_layer,
        )
        context_layer = context_layer.view(-1, self.num_attention_heads, _shape(context_layer)[-2], _shape(context_layer)[-1])
        context_layer = context_layer.permute(0, 2, 1, 3).contiguous()
        new_context_layer_shape = _shape(context_layer)[:-2] + (-1,)
        return context_layer.view(new_context_layer_shape)

    def _disentangled_bias(self, query_layer, key_layer, rel_embeddings, scale_factor, ids, ids_t):
        att_span = self.pos_ebd_size
        rel_embeddings = rel_embeddings[0:att_span * 2, :].unsqueeze(0)
        score = 0

        if self.share_att_key:
            pos_key_layer = self.transpose_for_scores(self.key_proj(rel_embeddings), self.num_attention_heads)
            pos_query_layer = self.transpose_for_scores(self.query_proj(rel_embeddings), self.num_attention_heads)
        else:
            if "c2p" in self.pos_att_type:
                pos_key_layer = self.transpose_for_scores(self.pos_key_proj(rel_embeddings), self.num_attention_heads)
            if "p2c" in self.pos_att_type:
                pos_query_layer = self.transpose_for_scores(self.pos_query_proj(rel_embeddings), self.num_attention_heads)

        if "c2p" in self.pos_att_type:
            sc = torch.sqrt(self.scale_mult * scale_factor)
            c2p_att = torch.bmm(query_layer, pos_key_layer.transpose(-1, -2))
            bs, sz, n_fts = _shape(c2p_att)
            c2p_att = self.selector(c2p_att.view(-1), ids).view(bs, sz, sz)
            score = score + c2p_att / sc

        if "p2c" in self.pos_att_type:
            sc = torch.sqrt(self.scale_mult * scale_factor)
            p2c_att = torch.bmm(key_layer, pos_query_layer.transpose(-1, -2))
            bs, sz, n_fts = _shape(p2c_att)
            p2c_att = self.selector(p2c_att.view(-1), ids_t).view(bs, sz, sz).transpose(-1, -2)
            score = score + p2c_att / sc

        return score


class DebertaV2Attention(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.self = DisentangledSelfAttention(config)
        self.output = DebertaV2SelfOutput(config)

    def forward(self, hidden_states, rel_embeddings=None, ids=None, ids_t=None):
        self_output = self.self(hidden_states, rel_embeddings=rel_embeddings, ids=ids, ids_t=ids_t)
        return self.output(self_output, hidden_states)


class DebertaV2Intermediate(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config["hidden_size"], config["intermediate_size"])
        self.act = nn.Mish()

    def forward(self, hidden_states):
        return self.act(self.dense(hidden_states))


class DebertaV2OutputLayer(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config["intermediate_size"], config["hidden_size"])
        self.LayerNorm = LayerNorm(config["hidden_size"], config["layer_norm_eps"])

    def forward(self, hidden_states, input_tensor):
        hidden_states = self.dense(hidden_states)
        return self.LayerNorm(hidden_states + input_tensor)


class DebertaV2Layer(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.attention = DebertaV2Attention(config)
        self.intermediate = DebertaV2Intermediate(config)
        self.output = DebertaV2OutputLayer(config)

    def forward(self, hidden_states, rel_embeddings=None, ids=None, ids_t=None):
        attention_output = self.attention(hidden_states, rel_embeddings=rel_embeddings, ids=ids, ids_t=ids_t)
        intermediate_output = self.intermediate(attention_output)
        return self.output(intermediate_output, attention_output)


class DebertaV2SkipOutput(nn.Module):
    """Modified output that adds skip connection BEFORE the dense layer."""
    def __init__(self, config):
        super().__init__()
        self.dense = nn.Linear(config["intermediate_size"], config["output_size"])
        self.LayerNorm = LayerNorm(config["output_size"], config["layer_norm_eps"])

    def forward(self, hidden_states, input_tensor):
        hidden_states = self.dense(hidden_states + input_tensor)
        return self.LayerNorm(hidden_states)


class DebertaV2Encoder(nn.Module):
    def __init__(self, config):
        super().__init__()
        self.layer = nn.ModuleList([DebertaV2Layer(config)])
        self.relative_attention = config.get("relative_attention", False)
        pos_ebd_size = config.get("position_buckets", config.get("max_relative_positions", 512)) * 2
        if self.relative_attention:
            self.rel_embeddings = nn.Embedding(pos_ebd_size, config["hidden_size"])
        self.norm_rel_ebd = config.get("norm_rel_ebd", "none").lower().split("|")
        if "layer_norm" in self.norm_rel_ebd:
            self.LayerNorm = LayerNorm(config["hidden_size"], config["layer_norm_eps"])

    def get_rel_embedding(self):
        rel_embeddings = self.rel_embeddings.weight if self.relative_attention else None
        if rel_embeddings is not None and "layer_norm" in self.norm_rel_ebd:
            rel_embeddings = self.LayerNorm(rel_embeddings)
        return rel_embeddings

    def forward(self, hidden_states, ids=None, ids_t=None):
        rel_embeddings = self.get_rel_embedding()
        output = hidden_states
        for layer_module in self.layer:
            output = layer_module(output, rel_embeddings=rel_embeddings, ids=ids, ids_t=ids_t)
        return output  # last_hidden_state


# ---------------------------------------------------------------------------
# Main model (from TheoViel's tflite/models.py — nobuco removed)
# ---------------------------------------------------------------------------

def compute_ids(transpose=True, max_len=50, position_buckets=50):
    if transpose:
        ids = np.arange(max_len)[None] - np.arange(max_len)[:, None] + position_buckets
    else:
        ids = np.arange(max_len)[:, None] - np.arange(max_len)[None] + position_buckets
    ids += np.arange(0, max_len)[:, None] * position_buckets * 2
    return torch.from_numpy(ids[None])


def make_deberta_config(hidden_size, intermediate_size, output_size, num_heads, drop_rate, max_len):
    """Build a config dict mimicking HF AutoConfig for microsoft/deberta-v3-base."""
    return {
        "hidden_size": hidden_size,
        "intermediate_size": intermediate_size,
        "output_size": output_size,
        "num_hidden_layers": 1,
        "num_attention_heads": num_heads,
        "attention_probs_dropout_prob": drop_rate,
        "hidden_dropout_prob": drop_rate,
        "layer_norm_eps": 1e-7,
        "relative_attention": True,
        "max_relative_positions": max_len,
        "position_buckets": max_len,
        "max_len": max_len,
        "pos_att_type": ["p2c", "c2p"],
        "norm_rel_ebd": "layer_norm",
        "share_att_key": False,
    }


class SignMLPBert3Export(nn.Module):
    """
    Self-contained re-implementation of TheoViel's tflite Model class for ONNX export.
    No dependency on `transformers` or `nobuco`.
    Input:  x  [n_frames, 5, 100]  (type, x, y, z, landmark_id)
    Output: logits  [1, 250]
    """
    def __init__(
        self,
        embed_dim=16,
        dense_dim=192,
        transfo_dim=768,
        transfo_layers=3,
        transfo_heads=16,
        num_classes=250,
        drop_rate=0,
        n_landmarks=100,
        max_len=25,
    ):
        super().__init__()
        self.num_classes = num_classes
        self.transfo_heads = transfo_heads
        self.max_len = max_len

        self.type_embed = nn.Embedding(9, embed_dim, padding_idx=0)
        self.landmark_embed = nn.Embedding(n_landmarks + 1, embed_dim, padding_idx=0)
        self.type_norm = nn.LayerNorm(embed_dim)
        self.landmark_norm = nn.LayerNorm(embed_dim)

        self.pos_cnn = nn.Sequential(
            nn.Conv1d(3, 8, kernel_size=5, padding=2, bias=False),
            nn.Conv1d(8, 16, kernel_size=5, padding=2, bias=False),
        )
        self.pos_dense = nn.Linear(19, embed_dim)
        self.dense = nn.Linear(3 * embed_dim, embed_dim)

        drop_mlp = drop_rate if dense_dim >= 256 else drop_rate / 2
        self.left_hand_mlp = nn.Sequential(nn.Linear(embed_dim * 21, dense_dim), nn.BatchNorm1d(dense_dim), nn.Dropout(p=drop_mlp), nn.Mish())
        self.right_hand_mlp = nn.Sequential(nn.Linear(embed_dim * 21, dense_dim), nn.BatchNorm1d(dense_dim), nn.Dropout(p=drop_mlp), nn.Mish())
        self.lips_mlp = nn.Sequential(nn.Linear(embed_dim * 21, dense_dim), nn.BatchNorm1d(dense_dim), nn.Dropout(p=drop_mlp), nn.Mish())
        self.face_mlp = nn.Sequential(nn.Linear(embed_dim * 25, dense_dim), nn.BatchNorm1d(dense_dim), nn.Dropout(p=drop_mlp), nn.Mish())
        self.full_mlp = nn.Sequential(nn.Linear(embed_dim * n_landmarks, dense_dim), nn.BatchNorm1d(dense_dim), nn.Dropout(p=drop_mlp), nn.Mish())

        # Transformer dim progression for 3-layer config
        transfo_dim_ = transfo_dim
        if transfo_layers == 3:
            if transfo_dim <= 1024:
                delta = min(256, transfo_dim - 512)
                transfo_dim = 512
            else:
                delta = (transfo_dim - 1024) // 2
                transfo_dim = 1024
        else:
            delta = 0
        self.transfo_dim = transfo_dim

        self.landmark_mlp = nn.Sequential(nn.Linear(dense_dim * 4, transfo_dim), nn.BatchNorm1d(transfo_dim), nn.Dropout(p=drop_rate), nn.Mish())

        # Transformer 1
        cfg1 = make_deberta_config(transfo_dim, transfo_dim, transfo_dim + delta if transfo_layers >= 2 else transfo_dim, transfo_heads, drop_rate, max_len)
        self.frame_transformer_1 = DebertaV2Encoder(cfg1)
        self.frame_transformer_1.layer[0].output = DebertaV2SkipOutput(cfg1)

        # Transformer 2
        self.frame_transformer_2 = None
        if transfo_layers >= 2:
            out2 = transfo_dim + delta + (delta if transfo_layers >= 3 and transfo_dim_ >= 1024 else 0)
            dr2 = drop_rate * 2 if delta > 0 else drop_rate
            cfg2 = make_deberta_config(transfo_dim + delta, transfo_dim + delta, out2, transfo_heads, dr2, max_len)
            self.frame_transformer_2 = DebertaV2Encoder(cfg2)
            self.frame_transformer_2.layer[0].output = DebertaV2SkipOutput(cfg2)

        # Transformer 3
        self.frame_transformer_3 = None
        if transfo_layers >= 3:
            in3 = cfg2["output_size"] if self.frame_transformer_2 else transfo_dim
            out3 = in3 - delta  # final output shrinks back
            dr3 = dr2 * 2 if transfo_dim_ >= 1024 and delta > 0 else dr2
            cfg3 = make_deberta_config(in3, in3, out3, transfo_heads, dr3, max_len)
            self.frame_transformer_3 = DebertaV2Encoder(cfg3)
            self.frame_transformer_3.layer[0].output = DebertaV2SkipOutput(cfg3)
            final_dim = out3
        elif self.frame_transformer_2:
            final_dim = cfg2["output_size"]
        else:
            final_dim = cfg1["output_size"]

        self.logits = nn.Linear(final_dim, num_classes)

        # Precompute relative position IDs
        self.register_buffer("_ids", torch.zeros(max_len, 1, max_len, max_len, dtype=torch.int))
        self.register_buffer("_ids_t", torch.zeros(max_len, 1, max_len, max_len, dtype=torch.int))
        for k in range(1, max_len + 1):
            self._ids[k - 1, :, :k, :k] = compute_ids(False, k, max_len)
            self._ids_t[k - 1, :, :k, :k] = compute_ids(True, k, max_len)
        self.register_buffer("_offset", torch.arange(transfo_heads, dtype=torch.int) * 2 * max_len)

    def forward(self, x):
        # x: [n_frames, 5, 100]
        x = x.unsqueeze(0)  # [1, sz, 5, 100]
        bs = x.shape[0]
        sz = x.shape[1]
        n_landmarks = x.shape[3]

        x_type = self.type_norm(self.type_embed(x[:, :, 0].long()))
        x_landmark = self.landmark_norm(self.landmark_embed(x[:, :, 4].long()))

        x_pos_ = x[:, :, 1:4].transpose(2, 3).contiguous()
        x_pos_ = F.pad(x_pos_, (0, 0, 0, 0, 0, 2))

        x_pos = x_pos_.transpose(1, 2).transpose(2, 3).contiguous().view(bs * n_landmarks, 3, -1)
        x_pos = self.pos_cnn(x_pos)
        x_pos = x_pos.view(bs, n_landmarks, 16, -1).transpose(2, 3).transpose(1, 2).contiguous()
        x_pos = torch.cat([x_pos_, x_pos], -1)
        x_pos = x_pos[:, :-2]
        x_pos = self.pos_dense(x_pos)

        fts = self.dense(torch.cat([x_type, x_landmark, x_pos], -1))
        n_fts = fts.size(-1)
        embed = x[:, :, 0].contiguous().unsqueeze(1).view(-1).long()

        # Body-part-specific MLPs
        left_hand_fts = fts.view(-1, n_fts)[embed == 1].view(bs, -1, 21, n_fts)
        left_hand_fts = left_hand_fts - left_hand_fts.mean(1).mean(1).unsqueeze(1).unsqueeze(1)
        left_hand_fts = self.left_hand_mlp(left_hand_fts.view(-1, 21 * n_fts))

        right_hand_fts = fts.view(-1, n_fts)[embed == 2].view(bs, -1, 21, n_fts)
        right_hand_fts = right_hand_fts - right_hand_fts.mean(1).mean(1).unsqueeze(1).unsqueeze(1)
        right_hand_fts = self.right_hand_mlp(right_hand_fts.view(-1, 21 * n_fts))

        hand_fts = torch.stack([left_hand_fts, right_hand_fts], -1).amax(-1)

        lips_fts = fts.view(-1, n_fts)[embed == 4].view(bs, -1, 21, n_fts)
        lips_fts = lips_fts - lips_fts.mean(1).mean(1).unsqueeze(1).unsqueeze(1)
        lips_fts = self.lips_mlp(lips_fts.view(-1, 21 * n_fts))

        face_fts = fts.view(-1, n_fts)[(embed == 3) | (embed == 6)].view(bs, -1, 25, n_fts)
        face_fts = face_fts - face_fts.mean(1).mean(1).unsqueeze(1).unsqueeze(1)
        face_fts = self.face_mlp(face_fts.view(-1, 25 * n_fts))

        fts = self.full_mlp(fts.view(-1, n_fts * n_landmarks))
        fts = torch.cat([fts, hand_fts, lips_fts, face_fts], -1)
        fts = self.landmark_mlp(fts)
        fts = fts.view(bs, -1, self.transfo_dim)

        # Position IDs
        ids_t = self._ids_t[sz - 1, :, :sz, :sz].contiguous()
        ids = self._ids[sz - 1, :, :sz, :sz].contiguous()
        offset = (self._offset.unsqueeze(1).unsqueeze(1) * sz)
        ids = (ids + offset).view(-1)
        ids_t = (ids_t + offset).view(-1)

        # Transformer layers
        fts = self.frame_transformer_1(fts, ids=ids, ids_t=ids_t)
        if self.frame_transformer_2 is not None:
            fts = self.frame_transformer_2(fts, ids=ids, ids_t=ids_t)
        if self.frame_transformer_3 is not None:
            fts = self.frame_transformer_3(fts, ids=ids, ids_t=ids_t)

        fts = fts.mean(1)
        return self.logits(fts)


# ---------------------------------------------------------------------------
# Weight loading & export
# ---------------------------------------------------------------------------

def load_weights(model: SignMLPBert3Export, pt_path: str):
    """Load TheoViel .pt weights into our export model, handling key name differences."""
    state = torch.load(pt_path, map_location="cpu", weights_only=False)
    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]
    elif hasattr(state, "state_dict"):
        state = state.state_dict()

    # The TheoViel tflite Model stores transformer output as .last_hidden_state;
    # our DebertaV2Encoder returns directly. Keys should match if layer structure matches.
    model_dict = model.state_dict()

    # Strip DataParallel's "module." prefix if present
    cleaned = {}
    for k, v in state.items():
        key = k[len("module."):] if k.startswith("module.") else k
        cleaned[key] = v
    state = cleaned

    # Filter out position id buffers (we recompute them)
    filtered = {}
    skipped = []
    for k, v in state.items():
        if k.startswith("_ids") or k.startswith("_ids_t") or k.startswith("_offset"):
            skipped.append(k)
            continue
        if k in model_dict and model_dict[k].shape == v.shape:
            filtered[k] = v
        else:
            skipped.append(k)

    model_dict.update(filtered)
    model.load_state_dict(model_dict, strict=False)
    print(f"Loaded {len(filtered)}/{len(state)} weight tensors (skipped {len(skipped)})")
    if skipped:
        print(f"  Skipped keys: {skipped[:10]}{'...' if len(skipped) > 10 else ''}")
    return model


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    weights_path = sys.argv[1]
    script_dir = Path(__file__).parent
    out_path = script_dir.parent / "models" / "saved_model" / "asl_deberta.onnx"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    from landmark_config import (
        SEQ_LEN, NUM_CLASSES, EMBED_DIM, DENSE_DIM,
        TRANSFO_DIM, TRANSFO_HEADS, TRANSFO_LAYERS, N_LANDMARKS,
        TYPE_ARRAY,
    )

    print("Building model...")
    model = SignMLPBert3Export(
        embed_dim=EMBED_DIM,
        dense_dim=DENSE_DIM,
        transfo_dim=TRANSFO_DIM,
        transfo_layers=TRANSFO_LAYERS,
        transfo_heads=TRANSFO_HEADS,
        num_classes=NUM_CLASSES,
        drop_rate=0,  # inference
        n_landmarks=N_LANDMARKS,
        max_len=SEQ_LEN,
    )

    n_params = sum(p.numel() for p in model.parameters())
    print(f"Model parameters: {n_params:,}")

    print(f"Loading weights from {weights_path}...")
    model = load_weights(model, weights_path)
    model.eval()

    print("Exporting to ONNX...")
    # Build a realistic dummy: channel 0 = type (int 0-8), 1-3 = xyz (float), 4 = landmark_id (int 0-N)
    dummy = torch.zeros(SEQ_LEN, 5, N_LANDMARKS)
    dummy[:, 0, :] = torch.tensor(TYPE_ARRAY, dtype=torch.float32).unsqueeze(0)  # type ids
    dummy[:, 1:4, :] = torch.randn(SEQ_LEN, 3, N_LANDMARKS)  # xyz coords
    dummy[:, 4, :] = torch.arange(N_LANDMARKS, dtype=torch.float32).unsqueeze(0) + 1  # landmark ids 1..N

    # Verify forward pass works
    with torch.no_grad():
        out = model(dummy)
        print(f"  Forward pass OK — output shape: {out.shape}")

    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "seq_len"}, "output": {0: "batch_size"}},
        opset_version=17,
        dynamo=False,
    )

    import os
    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"\nSaved: {out_path} ({size_mb:.1f} MB)")

    # Verify with onnxruntime
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(str(out_path))
        ort_out = sess.run(None, {"input": dummy.numpy()})
        diff = np.abs(out.numpy() - ort_out[0]).max()
        print(f"ONNX verification: max abs diff = {diff:.2e} {'✓' if diff < 1e-4 else '✗'}")
    except ImportError:
        print("(Install onnxruntime for verification)")


if __name__ == "__main__":
    main()
