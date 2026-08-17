import os
import tempfile

import pytest

# Point the app at a throwaway database before anything imports settings.
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db.name}"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["OPENAI_API_KEY"] = ""  # AI routes should 503, not call out

from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine, SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.lawyer import Lawyer  # noqa: E402
from app.services import rate_limit  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    rate_limit.reset()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth(client):
    """Register a client account and return its Authorization header."""
    res = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123", "full_name": "Test User"},
    )
    assert res.status_code == 201, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


@pytest.fixture
def seeded_lawyers():
    """Three lawyers that make the matching assertions unambiguous."""
    rows = [
        Lawyer(
            name="Madrid Nomad Specialist",
            jurisdiction="ES",
            city="Madrid",
            country="Spain",
            specialties=["digital_nomad", "business_immigration"],
            languages=["es", "en"],
            hourly_rate=95,
            rating=4.9,
            reviews_count=120,
            years_experience=12,
            email="madrid@example.com",
            whatsapp="+34600000000",
        ),
        Lawyer(
            name="Berlin Work Permit Lawyer",
            jurisdiction="EU",
            city="Berlin",
            country="Germany",
            specialties=["work_visa"],
            languages=["en"],
            hourly_rate=140,
            rating=4.5,
            reviews_count=40,
            years_experience=8,
        ),
        Lawyer(
            name="New York Asylum Lawyer",
            jurisdiction="US",
            city="New York",
            country="United States",
            specialties=["asylum"],
            languages=["en"],
            hourly_rate=120,
            rating=4.8,
            reviews_count=90,
            years_experience=15,
        ),
    ]
    with SessionLocal() as db:
        db.add_all(rows)
        db.commit()
        return [r.id for r in rows]
