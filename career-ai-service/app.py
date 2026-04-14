import os
import re
from typing import List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


DATASET_PATH = os.getenv("JOB_DATASET_PATH", "data/jobs.csv")
EMBEDDINGS_ENABLED = os.getenv("ENABLE_EMBEDDINGS", "false").lower() == "true"
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


class RecommendRequest(BaseModel):
    user_skills: List[str] = Field(default_factory=list)
    desired_role: str = ""
    top_k: int = Field(default=8, ge=1, le=25)
    min_score: float = Field(default=0, ge=0, le=100)
    use_embeddings: bool = False


class SkillGapRequest(BaseModel):
    user_skills: List[str] = Field(default_factory=list)
    job_id: str


app = FastAPI(title="PlacementPro Career AI Service", version="1.0.0")
jobs_df: Optional[pd.DataFrame] = None
tfidf_vectorizer: Optional[TfidfVectorizer] = None
job_tfidf_matrix = None
embedder = None
job_embedding_matrix = None


def normalize_skill(skill: str) -> str:
    return re.sub(r"[^a-z0-9\s]", "", (skill or "").strip().lower())


def build_text_features(df: pd.DataFrame) -> pd.Series:
    title = df["job_title"].fillna("")
    skills = df["required_skills"].fillna("")
    company = df["company_name"].fillna("")
    industry = df["industry"].fillna("")
    return (
        title + " " + title + " " + skills + " " + skills + " " + company + " " + industry
    ).str.lower()


def ensure_dataset_columns(df: pd.DataFrame) -> pd.DataFrame:
    required = ["job_id", "job_title", "required_skills"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise RuntimeError(f"Dataset missing columns: {missing}")
    if "company_name" not in df.columns:
        df["company_name"] = "Unknown"
    if "industry" not in df.columns:
        df["industry"] = ""
    if "experience_level" not in df.columns:
        df["experience_level"] = ""
    if "company_location" not in df.columns:
        df["company_location"] = ""
    return df


def initialize():
    global jobs_df, tfidf_vectorizer, job_tfidf_matrix, embedder, job_embedding_matrix
    if not os.path.exists(DATASET_PATH):
        raise RuntimeError(f"Dataset file not found: {DATASET_PATH}")

    jobs_df = pd.read_csv(DATASET_PATH)
    jobs_df = ensure_dataset_columns(jobs_df).reset_index(drop=True)

    tfidf_vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=6000,
        min_df=2,
        stop_words="english",
        lowercase=True,
    )
    job_tfidf_matrix = tfidf_vectorizer.fit_transform(build_text_features(jobs_df))

    if EMBEDDINGS_ENABLED and SentenceTransformer is not None:
        embedder = SentenceTransformer(EMBEDDING_MODEL)
        job_embedding_matrix = embedder.encode(
            build_text_features(jobs_df).tolist(), convert_to_numpy=True, show_progress_bar=False
        )


def build_query(user_skills: List[str], desired_role: str) -> str:
    skills = ", ".join([s.strip() for s in user_skills if s and s.strip()])
    role = desired_role.strip()
    return f"{role} {role} {skills}".strip().lower()


def recommend_tfidf(query: str, top_k: int) -> np.ndarray:
    q_vec = tfidf_vectorizer.transform([query])
    scores = cosine_similarity(q_vec, job_tfidf_matrix)[0]
    idx = scores.argsort()[-top_k:][::-1]
    return np.array([(i, float(scores[i] * 100.0)) for i in idx], dtype=object)


def recommend_embeddings(query: str, top_k: int) -> np.ndarray:
    q_emb = embedder.encode([query], convert_to_numpy=True, show_progress_bar=False)
    sim = cosine_similarity(q_emb, job_embedding_matrix)[0]
    idx = sim.argsort()[-top_k:][::-1]
    return np.array([(i, float(sim[i] * 100.0)) for i in idx], dtype=object)


@app.on_event("startup")
def on_startup():
    initialize()


@app.get("/health")
def health():
    return {
        "success": True,
        "dataset_rows": int(len(jobs_df)) if jobs_df is not None else 0,
        "embeddings_enabled": bool(embedder is not None),
    }


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if jobs_df is None or tfidf_vectorizer is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    query = build_query(req.user_skills, req.desired_role)
    if not query:
        raise HTTPException(status_code=400, detail="Provide desired_role or user_skills")

    use_embeddings = bool(req.use_embeddings and embedder is not None and job_embedding_matrix is not None)
    rows = recommend_embeddings(query, req.top_k) if use_embeddings else recommend_tfidf(query, req.top_k)

    results = []
    for idx, score in rows:
        if score < req.min_score:
            continue
        row = jobs_df.iloc[int(idx)]
        required = [s.strip() for s in str(row.get("required_skills", "")).split(",") if s.strip()]
        results.append(
            {
                "job_id": str(row.get("job_id", "")),
                "job_title": str(row.get("job_title", "")),
                "company_name": str(row.get("company_name", "Unknown")),
                "required_skills": required,
                "experience_level": str(row.get("experience_level", "")),
                "location": str(row.get("company_location", "")),
                "relevance_score": round(float(score), 2),
            }
        )

    return {"success": True, "data": {"recommendations": results, "query": query, "mode": "embeddings" if use_embeddings else "tfidf"}}


@app.post("/skill-gap")
def skill_gap(req: SkillGapRequest):
    if jobs_df is None:
        raise HTTPException(status_code=503, detail="Service not initialized")

    target = jobs_df[jobs_df["job_id"].astype(str) == str(req.job_id)]
    if target.empty:
        raise HTTPException(status_code=404, detail="Job not found")

    row = target.iloc[0]
    required_raw = [s.strip() for s in str(row.get("required_skills", "")).split(",") if s.strip()]
    user_raw = [s.strip() for s in req.user_skills if s and s.strip()]

    required = set([normalize_skill(s) for s in required_raw if normalize_skill(s)])
    user = set([normalize_skill(s) for s in user_raw if normalize_skill(s)])

    matching = sorted(list(required & user))
    missing = sorted(list(required - user))
    extra = sorted(list(user - required))
    pct = round((len(matching) / len(required) * 100.0), 2) if required else 0.0

    return {
        "success": True,
        "data": {
            "job_id": str(row.get("job_id", "")),
            "job_title": str(row.get("job_title", "")),
            "company_name": str(row.get("company_name", "Unknown")),
            "matching_skills": matching,
            "missing_skills": missing,
            "additional_skills": extra,
            "match_percentage": pct,
        },
    }
