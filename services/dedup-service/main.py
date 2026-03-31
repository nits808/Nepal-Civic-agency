# ═══════════════════════════════════════════════════════════════
# Nepal Civic Intelligence Graph 3.0 — Dedup Service
# Locality-Sensitive Hashing (LSH) + Semantic Similarity
# for detecting and merging duplicate news articles
# ═══════════════════════════════════════════════════════════════

import os
import json
import hashlib
import logging
from datetime import datetime
from typing import Optional
from collections import defaultdict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

logger = logging.getLogger("dedup-service")
logging.basicConfig(level=logging.INFO)


class DedupRequest(BaseModel):
    documents: list[dict] = Field(..., description="List of documents to deduplicate")
    threshold: float = Field(default=0.85, ge=0.0, le=1.0)


class DedupResult(BaseModel):
    clusters: list[dict]
    total_input: int
    total_unique: int
    total_duplicates: int
    processing_time_ms: float


class SimilarityRequest(BaseModel):
    text_a: str
    text_b: str


# ── MinHash Implementation ────────────────────────────────────
class MinHash:
    """MinHash signature generation for Jaccard similarity estimation."""

    def __init__(self, num_perm: int = 128):
        self.num_perm = num_perm
        self._max_hash = (1 << 32) - 1
        self._mersenne_prime = (1 << 61) - 1
        import random
        random.seed(42)
        self._a = [random.randint(1, self._mersenne_prime) for _ in range(num_perm)]
        self._b = [random.randint(0, self._mersenne_prime) for _ in range(num_perm)]

    def _shingle(self, text: str, k: int = 3) -> set:
        """Generate k-character shingles from text."""
        text = text.lower().strip()
        return set(text[i:i+k] for i in range(len(text) - k + 1))

    def signature(self, text: str) -> list[int]:
        """Compute MinHash signature for a text."""
        shingles = self._shingle(text)
        sig = [self._max_hash] * self.num_perm

        for s in shingles:
            h = int(hashlib.md5(s.encode()).hexdigest(), 16) & self._max_hash
            for i in range(self.num_perm):
                val = (self._a[i] * h + self._b[i]) % self._mersenne_prime
                if val < sig[i]:
                    sig[i] = val

        return sig

    def jaccard_estimate(self, sig_a: list[int], sig_b: list[int]) -> float:
        """Estimate Jaccard similarity from two MinHash signatures."""
        matches = sum(1 for a, b in zip(sig_a, sig_b) if a == b)
        return matches / len(sig_a)


# ── LSH (Locality-Sensitive Hashing) ──────────────────────────
class LSH:
    """LSH for approximate nearest neighbor search."""

    def __init__(self, num_bands: int = 16, rows_per_band: int = 8):
        self.num_bands = num_bands
        self.rows_per_band = rows_per_band
        self.buckets = defaultdict(set)  # band_hash -> set of doc_ids

    def index(self, doc_id: str, signature: list[int]):
        """Index a document's MinHash signature."""
        for band_idx in range(self.num_bands):
            start = band_idx * self.rows_per_band
            end = start + self.rows_per_band
            band_slice = tuple(signature[start:end])
            band_hash = hash((band_idx, band_slice))
            self.buckets[band_hash].add(doc_id)

    def query(self, signature: list[int]) -> set:
        """Find candidate duplicates."""
        candidates = set()
        for band_idx in range(self.num_bands):
            start = band_idx * self.rows_per_band
            end = start + self.rows_per_band
            band_slice = tuple(signature[start:end])
            band_hash = hash((band_idx, band_slice))
            if band_hash in self.buckets:
                candidates.update(self.buckets[band_hash])
        return candidates

    def clear(self):
        self.buckets.clear()


# ── Deduplication Engine ───────────────────────────────────────
class DedupEngine:
    def __init__(self):
        self.minhash = MinHash(num_perm=128)
        self.lsh = LSH(num_bands=16, rows_per_band=8)

    def deduplicate(self, documents: list[dict], threshold: float = 0.85) -> DedupResult:
        start = datetime.now()

        self.lsh.clear()
        signatures = {}
        doc_map = {}

        # Step 1: Compute signatures and index
        for doc in documents:
            doc_id = doc.get("id", hashlib.md5(doc.get("title", "").encode()).hexdigest()[:12])
            text = f"{doc.get('title', '')} {doc.get('content', '')}"
            sig = self.minhash.signature(text)
            signatures[doc_id] = sig
            doc_map[doc_id] = doc
            self.lsh.index(doc_id, sig)

        # Step 2: Find clusters
        processed = set()
        clusters = []

        for doc_id, sig in signatures.items():
            if doc_id in processed:
                continue

            candidates = self.lsh.query(sig) - {doc_id} - processed

            cluster_members = [doc_id]
            for cand_id in candidates:
                if cand_id in processed:
                    continue
                similarity = self.minhash.jaccard_estimate(sig, signatures[cand_id])
                if similarity >= threshold:
                    cluster_members.append(cand_id)
                    processed.add(cand_id)

            processed.add(doc_id)

            # Determine canonical (earliest published)
            cluster_docs = [doc_map[mid] for mid in cluster_members if mid in doc_map]
            cluster_docs.sort(key=lambda d: d.get("publishedAt", ""))
            canonical = cluster_docs[0] if cluster_docs else doc_map[doc_id]

            clusters.append({
                "cluster_id": doc_id,
                "canonical": canonical,
                "duplicates": cluster_docs[1:] if len(cluster_docs) > 1 else [],
                "size": len(cluster_members),
                "is_duplicate_cluster": len(cluster_members) > 1,
            })

        total_dupes = sum(c["size"] - 1 for c in clusters if c["is_duplicate_cluster"])
        elapsed = (datetime.now() - start).total_seconds() * 1000

        return DedupResult(
            clusters=clusters,
            total_input=len(documents),
            total_unique=len(clusters),
            total_duplicates=total_dupes,
            processing_time_ms=round(elapsed, 2),
        )

    def compute_similarity(self, text_a: str, text_b: str) -> float:
        sig_a = self.minhash.signature(text_a)
        sig_b = self.minhash.signature(text_b)
        return self.minhash.jaccard_estimate(sig_a, sig_b)


engine = DedupEngine()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🔍 Dedup Service starting...")
    yield

app = FastAPI(
    title="NCIG Dedup Service",
    description="Duplicate detection and merging using LSH + MinHash",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "dedup-service"}


@app.post("/deduplicate", response_model=DedupResult)
async def deduplicate(request: DedupRequest):
    return engine.deduplicate(request.documents, request.threshold)


@app.post("/similarity")
async def check_similarity(request: SimilarityRequest):
    similarity = engine.compute_similarity(request.text_a, request.text_b)
    return {
        "similarity": round(similarity, 4),
        "is_duplicate": similarity >= 0.85,
        "is_related": similarity >= 0.5,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4008)
