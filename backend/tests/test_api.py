"""API-level tests: auth, permissions, the directory and the forum.

The AI routes are exercised only for their guard behaviour — OPENAI_API_KEY is
empty in the test environment, so nothing reaches OpenAI.
"""


# --------------------------------------------------------------------------- #
# Health & auth
# --------------------------------------------------------------------------- #
def test_health_reports_ai_disabled_without_a_key(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["ai_enabled"] is False


def test_register_login_and_me(client):
    register = client.post(
        "/api/auth/register",
        json={"email": "New@Example.com", "password": "password123", "full_name": "New User"},
    )
    assert register.status_code == 201
    assert register.json()["user"]["email"] == "new@example.com"  # normalised

    login = client.post(
        "/api/auth/login",
        json={"email": "new@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "New User"
    assert me.json()["role"] == "client"


def test_duplicate_email_is_rejected(client, auth):
    again = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "password": "password123"},
    )
    assert again.status_code == 409


def test_wrong_password_is_401(client, auth):
    res = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "wrong-password"},
    )
    assert res.status_code == 401


def test_short_password_is_rejected(client):
    res = client.post(
        "/api/auth/register", json={"email": "a@b.com", "password": "short"}
    )
    assert res.status_code == 422


def test_protected_routes_require_a_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/chat/sessions").status_code == 401
    assert client.post("/api/lawyers/match", json={}).status_code == 401


def test_garbage_token_is_401(client):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401


def test_locale_update_round_trips(client, auth):
    res = client.patch("/api/auth/me", json={"locale": "es"}, headers=auth)
    assert res.status_code == 200
    assert res.json()["locale"] == "es"


# --------------------------------------------------------------------------- #
# Lawyers
# --------------------------------------------------------------------------- #
def test_directory_filters_by_jurisdiction_and_specialty(client, seeded_lawyers):
    everyone = client.get("/api/lawyers").json()
    assert len(everyone) == 3

    spanish = client.get("/api/lawyers", params={"jurisdiction": "ES"}).json()
    assert [l["name"] for l in spanish] == ["Madrid Nomad Specialist"]

    nomads = client.get("/api/lawyers", params={"specialty": "digital_nomad"}).json()
    assert len(nomads) == 1

    spanish_speakers = client.get("/api/lawyers", params={"language": "es"}).json()
    assert len(spanish_speakers) == 1


def test_directory_search_matches_city(client, seeded_lawyers):
    found = client.get("/api/lawyers", params={"q": "berlin"}).json()
    assert [l["name"] for l in found] == ["Berlin Work Permit Lawyer"]


def test_unknown_lawyer_is_404(client):
    assert client.get("/api/lawyers/9999").status_code == 404


def test_match_endpoint_ranks_and_explains(client, auth, seeded_lawyers):
    res = client.post(
        "/api/lawyers/match",
        json={"jurisdiction": "ES", "specialties": ["digital_nomad"], "locale": "es", "limit": 3},
        headers=auth,
    )
    assert res.status_code == 200
    results = res.json()
    assert results[0]["name"] == "Madrid Nomad Specialist"
    assert results[0]["match_score"] > results[-1]["match_score"]
    assert results[0]["match_reasons"]


def test_consultation_returns_prefilled_deep_links(client, auth, seeded_lawyers):
    res = client.post(
        "/api/consultations",
        json={"lawyer_id": seeded_lawyers[0], "channel": "email", "message": "Hello there"},
        headers=auth,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["mailto_url"].startswith("mailto:")
    assert "Hello%20there" in body["mailto_url"]


def test_consultation_for_unknown_lawyer_is_404(client, auth):
    res = client.post(
        "/api/consultations", json={"lawyer_id": 4242, "channel": "email"}, headers=auth
    )
    assert res.status_code == 404


# --------------------------------------------------------------------------- #
# Forum
# --------------------------------------------------------------------------- #
def _category(client):
    from app.db import SessionLocal
    from app.models.forum import Category

    with SessionLocal() as db:
        category = Category(slug="spain", name_en="Spain", name_es="España")
        db.add(category)
        db.commit()
        return category.id


def test_categories_localise(client):
    _category(client)
    english = client.get("/api/forum/categories", params={"locale": "en"}).json()
    spanish = client.get("/api/forum/categories", params={"locale": "es"}).json()
    assert english[0]["name"] == "Spain"
    assert spanish[0]["name"] == "España"


def test_thread_and_reply_round_trip(client, auth):
    category_id = _category(client)

    created = client.post(
        "/api/forum/threads",
        json={
            "category_id": category_id,
            "title": "How long does arraigo take?",
            "body": "I submitted in April and I am still waiting. What is normal?",
        },
        headers=auth,
    )
    assert created.status_code == 201
    thread_id = created.json()["id"]

    reply = client.post(
        f"/api/forum/threads/{thread_id}/posts",
        json={"body": "Mine took about seven weeks in Madrid."},
        headers=auth,
    )
    assert reply.status_code == 201

    detail = client.get(f"/api/forum/threads/{thread_id}").json()
    assert detail["reply_count"] == 1
    assert detail["posts"][0]["author"]["full_name"] == "Test User"


def test_posting_requires_auth(client):
    category_id = _category(client)
    res = client.post(
        "/api/forum/threads",
        json={"category_id": category_id, "title": "No token here", "body": "Long enough body."},
    )
    assert res.status_code == 401


def test_thread_in_unknown_category_is_404(client, auth):
    res = client.post(
        "/api/forum/threads",
        json={"category_id": 999, "title": "Orphan thread", "body": "Long enough body text."},
        headers=auth,
    )
    assert res.status_code == 404


def test_locked_thread_rejects_replies(client, auth):
    from app.db import SessionLocal
    from app.models.forum import Thread

    category_id = _category(client)
    created = client.post(
        "/api/forum/threads",
        json={"category_id": category_id, "title": "Closing this one", "body": "Body long enough."},
        headers=auth,
    )
    thread_id = created.json()["id"]

    with SessionLocal() as db:
        db.get(Thread, thread_id).is_locked = True
        db.commit()

    res = client.post(
        f"/api/forum/threads/{thread_id}/posts", json={"body": "Late reply"}, headers=auth
    )
    assert res.status_code == 403


def test_report_requires_a_target(client, auth):
    assert client.post("/api/forum/reports", json={}, headers=auth).status_code == 400


# --------------------------------------------------------------------------- #
# Admin
# --------------------------------------------------------------------------- #
def test_admin_routes_reject_non_admins(client, auth):
    assert client.get("/api/admin/stats", headers=auth).status_code == 403
    assert client.get("/api/admin/lawyers", headers=auth).status_code == 403


def test_admin_can_crud_lawyers_and_see_stats(client):
    from app.db import SessionLocal
    from app.models.user import User, UserRole
    from app.security import hash_password

    with SessionLocal() as db:
        db.add(
            User(
                email="root@example.com",
                password_hash=hash_password("password123"),
                full_name="Root",
                role=UserRole.admin,
            )
        )
        db.commit()

    token = client.post(
        "/api/auth/login", json={"email": "root@example.com", "password": "password123"}
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/admin/lawyers",
        json={"name": "Ada Counsel", "jurisdiction": "ES", "specialties": ["asylum"]},
        headers=headers,
    )
    assert created.status_code == 201
    lawyer_id = created.json()["id"]

    updated = client.put(
        f"/api/admin/lawyers/{lawyer_id}",
        json={"name": "Ada Counsel", "jurisdiction": "ES", "hourly_rate": 175},
        headers=headers,
    )
    assert updated.json()["hourly_rate"] == 175

    assert client.get("/api/admin/stats", headers=headers).json()["lawyers"] == 1
    assert client.delete(f"/api/admin/lawyers/{lawyer_id}", headers=headers).status_code == 204
    assert client.get("/api/admin/stats", headers=headers).json()["lawyers"] == 0


# --------------------------------------------------------------------------- #
# AI guards
# --------------------------------------------------------------------------- #
def test_ai_routes_503_without_a_key(client, auth):
    chat = client.post(
        "/api/chat/stream",
        json={"message": "Can I get an EU Blue Card?", "jurisdiction": "EU", "locale": "en"},
        headers=auth,
    )
    assert chat.status_code == 503
    assert "OPENAI_API_KEY" in chat.json()["detail"]

    triage = client.post(
        "/api/triage",
        json={"description": "I am a Brazilian software engineer moving to Spain.",
              "jurisdiction": "ES", "locale": "en"},
        headers=auth,
    )
    assert triage.status_code == 503
