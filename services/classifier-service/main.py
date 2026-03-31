# ═══════════════════════════════════════════════════════════════
# Nepal Civic Intelligence Graph 3.0 — Classifier Service
# Multi-label classification: Category, Location, Source Type
# Uses XLM-RoBERTa for bilingual (Nepali + English) text
# ═══════════════════════════════════════════════════════════════

import os
import json
import asyncio
import logging
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager

# ── Configuration ──────────────────────────────────────────────
KAFKA_BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")
MODEL_PATH = os.getenv("MODEL_PATH", "./models")

# Categories for civic intelligence
CATEGORIES = [
    "health", "economy", "politics", "education", "infrastructure",
    "disaster", "agriculture", "environment", "law", "technology",
    "social", "defense", "tourism", "sports", "culture"
]

# Nepal districts for location classification
NEPAL_DISTRICTS = [
    "Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Chitwan",
    "Morang", "Sunsari", "Rupandehi", "Jhapa", "Kaski",
    "Dhanusha", "Parsa", "Bara", "Sarlahi", "Siraha",
    "Saptari", "Banke", "Bardiya", "Kailali", "Kanchanpur",
    "Dang", "Kapilvastu", "Nawalparasi", "Makwanpur", "Rautahat",
    "Mahottari", "Surkhet", "Dailekh", "Jumla", "Dolpa",
    "Darchula", "Bajhang", "Bajura", "Achham", "Doti",
]

# Nepal provinces
PROVINCES = {
    "Province 1": ["Jhapa", "Morang", "Sunsari", "Saptari", "Siraha"],
    "Madhesh Province": ["Dhanusha", "Mahottari", "Sarlahi", "Rautahat", "Bara", "Parsa"],
    "Bagmati Province": ["Kathmandu", "Lalitpur", "Bhaktapur", "Makwanpur", "Chitwan"],
    "Gandaki Province": ["Kaski", "Pokhara"],
    "Lumbini Province": ["Rupandehi", "Kapilvastu", "Dang", "Banke", "Bardiya"],
    "Karnali Province": ["Surkhet", "Dailekh", "Jumla", "Dolpa"],
    "Sudurpashchim Province": ["Kailali", "Kanchanpur", "Darchula", "Bajhang", "Bajura", "Achham", "Doti"],
}

SOURCE_TYPES = ["government", "ngo", "media", "social", "academic"]

logger = logging.getLogger("classifier-service")
logging.basicConfig(level=logging.INFO)


# ── Models ─────────────────────────────────────────────────────
class ClassificationRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Text to classify")
    title: str = Field(default="", description="Document title")
    source_name: str = Field(default="", description="Source name for source type hints")
    language: str = Field(default="en", description="Language code: en or ne")


class ClassificationResult(BaseModel):
    categories: list[dict] = Field(description="Predicted categories with confidence")
    primary_category: str
    locations: list[dict] = Field(description="Detected locations with confidence")
    primary_province: Optional[str] = None
    primary_district: Optional[str] = None
    source_type: str
    source_type_confidence: float
    processing_time_ms: float


class BatchRequest(BaseModel):
    documents: list[ClassificationRequest]


# ── Classifier Engine ─────────────────────────────────────────
class CivicClassifier:
    """
    Production classifier using keyword-based heuristics + NLP patterns.
    In production, this would wrap a fine-tuned XLM-RoBERTa model.
    """

    def __init__(self):
        # Category keyword mappings (bilingual)
        self.category_keywords = {
            "health": ["health", "hospital", "disease", "covid", "vaccine", "medical",
                       "स्वास्थ्य", "अस्पताल", "रोग", "खोप"],
            "economy": ["economy", "gdp", "budget", "trade", "inflation", "tax", "revenue",
                        "अर्थतन्त्र", "बजेट", "व्यापार", "कर"],
            "politics": ["election", "parliament", "minister", "party", "government", "vote",
                         "निर्वाचन", "संसद", "मन्त्री", "दल"],
            "education": ["school", "university", "education", "student", "teacher", "exam",
                          "विद्यालय", "विश्वविद्यालय", "शिक्षा", "विद्यार्थी"],
            "infrastructure": ["road", "bridge", "construction", "highway", "building",
                                "सडक", "पुल", "निर्माण"],
            "disaster": ["earthquake", "flood", "landslide", "disaster", "relief", "rescue",
                         "भूकम्प", "बाढी", "पहिरो", "विपद"],
            "agriculture": ["agriculture", "farming", "crop", "irrigation", "farmer",
                            "कृषि", "खेती", "बाली", "किसान"],
            "environment": ["environment", "pollution", "forest", "climate", "wildlife",
                            "वातावरण", "प्रदूषण", "वन", "जलवायु"],
            "law": ["law", "court", "justice", "police", "crime", "legal", "act",
                    "कानून", "अदालत", "न्याय", "प्रहरी"],
            "technology": ["technology", "digital", "internet", "software", "startup",
                           "प्रविधि", "डिजिटल", "इन्टरनेट"],
            "social": ["social", "community", "welfare", "poverty", "gender", "caste",
                       "सामाजिक", "समुदाय", "गरिबी"],
            "defense": ["army", "military", "defense", "security", "border",
                        "सेना", "सैनिक", "रक्षा", "सुरक्षा"],
            "tourism": ["tourism", "tourist", "trekking", "everest", "adventure",
                        "पर्यटन", "पर्यटक", "ट्रेकिङ"],
            "sports": ["cricket", "football", "sports", "athlete", "olympic",
                       "क्रिकेट", "फुटबल", "खेलकुद"],
            "culture": ["culture", "festival", "heritage", "temple", "tradition",
                        "संस्कृति", "चाड", "सम्पदा", "मन्दिर"],
        }

        # Source type patterns
        self.source_patterns = {
            "government": ["gov.np", "ministry", "department", "government", "सरकार"],
            "ngo": ["ngo", "un ", "unicef", "undp", "red cross", "foundation", "संस्था"],
            "media": ["post", "times", "daily", "news", "khabar", "kantipur", "republica", "समाचार"],
            "social": ["twitter", "facebook", "social", "blog"],
            "academic": ["university", "journal", "research", "study", "विश्वविद्यालय"],
        }

        logger.info("CivicClassifier initialized")

    def classify_category(self, text: str) -> list[dict]:
        """Multi-label category classification with confidence scores."""
        text_lower = text.lower()
        scores = {}

        for category, keywords in self.category_keywords.items():
            hits = sum(1 for kw in keywords if kw in text_lower)
            if hits > 0:
                # Normalize confidence based on number of keyword hits
                confidence = min(0.95, 0.3 + (hits * 0.15))
                scores[category] = round(confidence, 3)

        if not scores:
            scores["politics"] = 0.3  # Default fallback

        # Sort by confidence descending
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [{"category": cat, "confidence": conf} for cat, conf in sorted_scores]

    def detect_locations(self, text: str) -> list[dict]:
        """Extract Nepal locations from text."""
        detected = []

        for district in NEPAL_DISTRICTS:
            if district.lower() in text.lower():
                # Find province
                province = None
                for prov, districts in PROVINCES.items():
                    if district in districts:
                        province = prov
                        break

                detected.append({
                    "district": district,
                    "province": province,
                    "confidence": 0.9,
                })

        # Also check for province-level mentions
        for province in PROVINCES.keys():
            if province.lower() in text.lower():
                exists = any(d["province"] == province for d in detected)
                if not exists:
                    detected.append({
                        "district": None,
                        "province": province,
                        "confidence": 0.85,
                    })

        return detected

    def classify_source_type(self, source_name: str, text: str) -> tuple[str, float]:
        """Classify the source type."""
        combined = (source_name + " " + text).lower()

        best_type = "media"
        best_score = 0.3

        for stype, patterns in self.source_patterns.items():
            hits = sum(1 for p in patterns if p in combined)
            if hits > 0:
                score = min(0.95, 0.4 + (hits * 0.2))
                if score > best_score:
                    best_type = stype
                    best_score = score

        return best_type, round(best_score, 3)

    def classify(self, request: ClassificationRequest) -> ClassificationResult:
        """Full classification pipeline."""
        start = datetime.now()
        combined_text = f"{request.title} {request.text}"

        # Multi-label category classification
        categories = self.classify_category(combined_text)
        primary_cat = categories[0]["category"] if categories else "politics"

        # Location detection
        locations = self.detect_locations(combined_text)
        primary_province = locations[0]["province"] if locations else None
        primary_district = locations[0]["district"] if locations else None

        # Source type classification
        source_type, source_conf = self.classify_source_type(
            request.source_name, combined_text
        )

        elapsed = (datetime.now() - start).total_seconds() * 1000

        return ClassificationResult(
            categories=categories,
            primary_category=primary_cat,
            locations=locations,
            primary_province=primary_province,
            primary_district=primary_district,
            source_type=source_type,
            source_type_confidence=source_conf,
            processing_time_ms=round(elapsed, 2),
        )


# ── Kafka Consumer (background) ───────────────────────────────
classifier = CivicClassifier()


# ── FastAPI App ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🏷️  Classifier Service starting...")
    yield
    logger.info("Classifier Service shutting down...")

app = FastAPI(
    title="NCIG Classifier Service",
    description="Multi-label classification for Nepal civic data",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "classifier-service",
        "model": "keyword-heuristic-v1",
        "categories": len(CATEGORIES),
        "districts": len(NEPAL_DISTRICTS),
    }


@app.post("/classify", response_model=ClassificationResult)
async def classify_text(request: ClassificationRequest):
    """Classify a single document."""
    try:
        result = classifier.classify(request)
        return result
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/classify/batch")
async def classify_batch(request: BatchRequest):
    """Classify multiple documents in batch."""
    results = []
    for doc in request.documents:
        try:
            result = classifier.classify(doc)
            results.append(result.model_dump())
        except Exception as e:
            results.append({"error": str(e), "text": doc.text[:100]})

    return {
        "results": results,
        "total": len(results),
        "successful": sum(1 for r in results if "error" not in r),
    }


@app.get("/categories")
async def list_categories():
    """List all available categories."""
    return {"categories": CATEGORIES, "total": len(CATEGORIES)}


@app.get("/districts")
async def list_districts():
    """List all districts by province."""
    return {"provinces": PROVINCES, "all_districts": NEPAL_DISTRICTS}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
