"""
Train a RandomForestClassifier on synthetic knee-rehab rep data.
Run from the backend/ directory:  python ml/train_model.py
Outputs:
  ml/model.pkl               – trained classifier
  ml/feature_importance.png  – bar chart of feature importances
"""

from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")   # headless — no display required
import matplotlib.pyplot as plt
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score, roc_curve
from sklearn.model_selection import train_test_split

# ── Reproducibility ────────────────────────────────────────────────────────────
rng = np.random.default_rng(seed=42)

# ── 1. Generate synthetic rep data ─────────────────────────────────────────────
# Each rep is described by three biomechanical features:
#   max_angle   – peak knee extension angle (degrees)
#   rep_duration – time to complete one rep (seconds)
#   knee_wobble  – lateral stability noise (arbitrary units)

N_GOOD, N_POOR = 300, 200

good = np.column_stack([
    rng.normal(loc=165, scale=8,   size=N_GOOD),   # max_angle
    rng.normal(loc=2.5, scale=0.4, size=N_GOOD),   # rep_duration
    rng.normal(loc=3,   scale=1,   size=N_GOOD),   # knee_wobble
])

poor = np.column_stack([
    rng.normal(loc=138, scale=12,  size=N_POOR),   # max_angle
    rng.normal(loc=1.4, scale=0.5, size=N_POOR),   # rep_duration
    rng.normal(loc=9,   scale=2,   size=N_POOR),   # knee_wobble
])

# Combine and assign labels: 1 = good, 0 = poor
X = np.vstack([good, poor])
y = np.array([1] * N_GOOD + [0] * N_POOR)

# ── 2. Train / test split (80 / 20) ───────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# ── 3. Train RandomForestClassifier ───────────────────────────────────────────
clf = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
clf.fit(X_train, y_train)

# ── 4. Evaluate on held-out test set ──────────────────────────────────────────
y_pred  = clf.predict(X_test)
y_proba = clf.predict_proba(X_test)[:, 1]   # probability of "good"

acc = accuracy_score(y_test, y_pred)
auc = roc_auc_score(y_test, y_proba)

print(f"Accuracy : {acc:.4f}")
print(f"AUC-ROC  : {auc:.4f}")

# ── 5. Save model ──────────────────────────────────────────────────────────────
out_dir = Path(__file__).parent
model_path = out_dir / "model.pkl"
joblib.dump(clf, model_path)
print(f"Model saved: {model_path}")

# ── 6. Feature importance bar chart ───────────────────────────────────────────
feature_names = ["max_angle", "rep_duration", "knee_wobble"]
importances   = clf.feature_importances_

fig, ax = plt.subplots(figsize=(6, 3.5))
bars = ax.barh(feature_names, importances, color=["#0ea5e9", "#10b981", "#f59e0b"])
ax.bar_label(bars, fmt="%.3f", padding=4, fontsize=10)
ax.set_xlabel("Importance", fontsize=11)
ax.set_title("Random Forest — Feature Importances", fontsize=12, fontweight="bold")
ax.set_xlim(0, max(importances) * 1.25)
ax.invert_yaxis()
fig.tight_layout()

chart_path = out_dir / "feature_importance.png"
fig.savefig(chart_path, dpi=120, bbox_inches="tight")
plt.close(fig)
print(f"Chart saved: {chart_path}")

# ── 7. AUC-ROC curve chart ─────────────────────────────────────────────────────
fpr, tpr, _ = roc_curve(y_test, y_proba)

fig2, ax2 = plt.subplots(figsize=(5, 4))
ax2.plot(fpr, tpr, color="#0ea5e9", lw=2.5, label=f"AUC = {auc:.3f}")
ax2.plot([0, 1], [0, 1], linestyle="--", color="#94a3b8", lw=1.5, label="Random baseline")
ax2.fill_between(fpr, tpr, alpha=0.08, color="#0ea5e9")
ax2.set_xlabel("False Positive Rate", fontsize=11)
ax2.set_ylabel("True Positive Rate", fontsize=11)
ax2.set_title("AUC-ROC Curve", fontsize=12, fontweight="bold")
ax2.legend(loc="lower right", fontsize=10)
ax2.set_xlim(0, 1)
ax2.set_ylim(0, 1.02)
fig2.tight_layout()

roc_path = out_dir / "roc_curve.png"
fig2.savefig(roc_path, dpi=120, bbox_inches="tight")
plt.close(fig2)
print(f"ROC curve saved: {roc_path}")
