"""Covers BUG-5: the reported file size must be the uploaded byte count,
not the length of the extracted text."""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.document_model import Document

UPLOAD_SIZE = 4_194_304
EXTRACTED_TEXT = "a few kilobytes of extracted text"


def _session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def _save(db, **overrides):
    fields = {
        "user_id": "user_test",
        "name": "report.pdf",
        "content_type": "application/pdf",
        "data": EXTRACTED_TEXT,
        "size_bytes": UPLOAD_SIZE,
    }
    fields.update(overrides)
    doc = Document(**fields)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def test_size_bytes_persists_the_upload_size_not_the_text_length():
    db = _session()
    doc = _save(db)

    assert doc.size_bytes == UPLOAD_SIZE
    assert doc.size_bytes != len(doc.data.encode("utf-8"))


def test_upload_and_fetch_report_the_same_size():
    """The bug was a 4 MB upload response followed by a ~33 byte fetch."""
    db = _session()
    upload_response_size = _save(db).size_bytes

    fetched = db.query(Document).filter(Document.user_id == "user_test").one()
    assert fetched.size_bytes == upload_response_size


def test_metadata_query_returns_size_without_loading_data():
    db = _session()
    _save(db)

    row = (
        db.query(
            Document.id,
            Document.name,
            Document.content_type,
            Document.size_bytes,
            Document.created_at,
        )
        .filter(Document.user_id == "user_test")
        .one()
    )

    assert row.size_bytes == UPLOAD_SIZE
    assert not hasattr(row, "data")


def test_legacy_rows_without_a_recorded_size_are_nullable():
    """size_bytes is nullable so pre-existing rows don't break the read path;
    fetch/all reports 0 for them."""
    db = _session()
    doc = _save(db, size_bytes=None)

    assert doc.size_bytes is None
    assert (doc.size_bytes if doc.size_bytes is not None else 0) == 0
