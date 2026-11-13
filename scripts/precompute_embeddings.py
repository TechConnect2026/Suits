"""Precomputes and bundles static InLegalBERT embeddings for:
1. All 947 Criminal Statutes Concordance pairs (doctrine_embeddings.npz)
2. Rhetorical Anchor Centroids for Headnote Segmentation (rhetorical_anchor_centroids.npz)
"""

import os
import sys
import time
import numpy as np

# Ensure backend is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.inlegal_bert_service import inlegal_bert_service
from app.data.criminal_statutes_concordance import CRIMINAL_CONCORDANCE_DATA
from app.services.headnote_service import _RATIO_ANCHORS, _ARGUMENT_ANCHORS, _DISPOSITION_ANCHORS

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "app", "data"))
DOCTRINE_PATH = os.path.join(DATA_DIR, "doctrine_embeddings.npz")
ANCHORS_PATH = os.path.join(DATA_DIR, "rhetorical_anchor_centroids.npz")

def precompute_doctrines():
    print(f"Generating InLegalBERT embeddings for {len(CRIMINAL_CONCORDANCE_DATA)} concordance items...")
    t0 = time.time()
    
    # Load existing if available to preserve already-embedded items
    existing_map = {}
    if os.path.exists(DOCTRINE_PATH):
        try:
            old_npz = np.load(DOCTRINE_PATH)
            old_cids = old_npz["cids"].tolist()
            old_vecs = old_npz["vectors"].tolist()
            existing_map = dict(zip(old_cids, old_vecs))
            print(f"Loaded {len(existing_map)} existing vectors from {DOCTRINE_PATH}")
        except Exception as e:
            print("Could not load existing npz:", e)

    cids = []
    vectors = []
    
    newly_embedded = 0
    for idx, item in enumerate(CRIMINAL_CONCORDANCE_DATA):
        cid = item["id"]
        cids.append(cid)
        if cid in existing_map:
            vectors.append(existing_map[cid])
        else:
            text_to_embed = f"{item['concept_doctrine']} {item['doctrine_summary']}"
            vec = inlegal_bert_service.embed_text(text_to_embed)
            vectors.append(vec)
            newly_embedded += 1
            if newly_embedded % 50 == 0:
                print(f"  Embedded {newly_embedded} new items... (total {idx + 1}/{len(CRIMINAL_CONCORDANCE_DATA)})")

    vec_arr = np.array(vectors, dtype=np.float32)
    cid_arr = np.array(cids)
    
    np.savez_compressed(DOCTRINE_PATH, cids=cid_arr, vectors=vec_arr)
    print(f"Saved {len(cids)} doctrine vectors to {DOCTRINE_PATH} (Shape: {vec_arr.shape}) in {time.time() - t0:.2f}s")


def precompute_anchors():
    print("Precomputing Rhetorical Anchor Centroids...")
    def _mean_centroid(texts: list[str]) -> np.ndarray:
        vecs = [inlegal_bert_service.embed_text(t) for t in texts]
        mean_v = np.mean(vecs, axis=0)
        norm = np.linalg.norm(mean_v)
        return mean_v / norm if norm > 1e-9 else mean_v

    ratio_vec = _mean_centroid(_RATIO_ANCHORS)
    arg_vec = _mean_centroid(_ARGUMENT_ANCHORS)
    disp_vec = _mean_centroid(_DISPOSITION_ANCHORS)

    np.savez_compressed(
        ANCHORS_PATH,
        ratio=ratio_vec.astype(np.float32),
        argument=arg_vec.astype(np.float32),
        disposition=disp_vec.astype(np.float32),
    )
    print(f"Saved rhetorical anchor centroids to {ANCHORS_PATH}")

if __name__ == "__main__":
    precompute_anchors()
    precompute_doctrines()
    print("All static InLegalBERT embeddings precomputed successfully!")
