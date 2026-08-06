"""Covers SEC-8: uploads must be capped, and the cap enforced without reading
the whole body into memory."""

import asyncio
import io

import pytest
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from app.core import uploads


def _upload(payload: bytes) -> UploadFile:
    return UploadFile(filename="report.pdf", file=io.BytesIO(payload))


def _client() -> TestClient:
    """A bare app wired like main.py: body-size middleware inside CORS."""
    app = FastAPI()
    app.middleware("http")(uploads.limit_request_body_size)
    app.add_middleware(
        CORSMiddleware, allow_origins=["http://localhost:3000"], allow_credentials=True
    )

    @app.post("/echo")
    async def echo():
        return {"ok": True}

    return TestClient(app)


def _measure(payload: bytes) -> int:
    return asyncio.run(uploads.measure_upload(_upload(payload)))


def test_returns_the_byte_count_for_an_accepted_upload():
    assert _measure(b"x" * 1024) == 1024


def test_upload_at_exactly_the_cap_is_accepted():
    assert _measure(b"x" * uploads.MAX_UPLOAD_BYTES) == uploads.MAX_UPLOAD_BYTES


def test_upload_one_byte_over_the_cap_is_rejected_with_413():
    with pytest.raises(HTTPException) as excinfo:
        _measure(b"x" * (uploads.MAX_UPLOAD_BYTES + 1))

    assert excinfo.value.status_code == 413


def test_file_is_rewound_for_the_caller():
    """save_document extracts text from the same handle afterwards."""
    payload = b"some file bytes"
    upload = _upload(payload)

    asyncio.run(uploads.measure_upload(upload))

    assert upload.file.read() == payload


def test_oversize_upload_is_not_fully_read():
    """The point of the streaming check — an oversize body must never be
    materialized in full."""
    payload = b"x" * (uploads.MAX_UPLOAD_BYTES * 2)
    upload = _upload(payload)

    with pytest.raises(HTTPException):
        asyncio.run(uploads.measure_upload(upload))

    # Aborted within one chunk of crossing the cap, not at the end of the body.
    assert upload.file.tell() <= uploads.MAX_UPLOAD_BYTES + uploads.CHUNK_SIZE


def test_middleware_rejects_an_oversize_content_length():
    response = _client().post("/echo", content=b"x" * (uploads.MAX_UPLOAD_BYTES + 1))

    assert response.status_code == 413
    assert "maximum upload size" in response.json()["detail"]


def test_middleware_passes_a_normal_request_through():
    response = _client().post("/echo", content=b"x" * 512)

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_413_carries_cors_headers():
    """CORS must wrap the limiter, or the browser sees an opaque network error
    rather than the 413."""
    response = _client().post(
        "/echo",
        content=b"x" * (uploads.MAX_UPLOAD_BYTES + 1),
        headers={"Origin": "http://localhost:3000"},
    )

    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_middleware_ignores_a_malformed_content_length():
    """A junk header must not 500 — the streaming check still backstops it."""
    response = _client().post(
        "/echo", content=b"x" * 512, headers={"Content-Length": "not-a-number"}
    )

    assert response.status_code != 500


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch):
    monkeypatch.delenv("MAX_UPLOAD_BYTES", raising=False)


def _resolve_cap():
    return uploads._resolve_positive_int(
        "MAX_UPLOAD_BYTES", uploads._DEFAULT_MAX_UPLOAD_BYTES
    )


def test_cap_defaults_to_ten_megabytes():
    assert _resolve_cap() == 10 * 1024 * 1024


def test_cap_is_configurable(monkeypatch):
    monkeypatch.setenv("MAX_UPLOAD_BYTES", "2048")
    assert _resolve_cap() == 2048


@pytest.mark.parametrize("value", ["", "   ", "lots", "0", "-1", "10MB"])
def test_malformed_cap_never_means_unlimited(monkeypatch, value):
    monkeypatch.setenv("MAX_UPLOAD_BYTES", value)
    assert _resolve_cap() == uploads._DEFAULT_MAX_UPLOAD_BYTES
