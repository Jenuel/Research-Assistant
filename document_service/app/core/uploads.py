import os

from fastapi import HTTPException, Request, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)

_DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024
_DEFAULT_CHUNK_SIZE = 64 * 1024


def _resolve_positive_int(env_var: str, default: int) -> int:
    """
    Resolve a positive integer from an environment variable.

    Falls back to *default* when the variable is unset, non-numeric, or
    non-positive — a malformed value must never be silently treated as zero
    or unlimited.

    :param env_var: Name of the environment variable to read.
    :param default: Value to use when the variable is absent or invalid.
    :return: Resolved positive integer.
    """
    raw = os.getenv(env_var, "").strip()
    if not raw:
        return default

    try:
        value = int(raw)
    except ValueError:
        logger.warning(
            f"{env_var}={raw!r} is not an integer; falling back to {default}"
        )
        return default

    if value <= 0:
        logger.warning(
            f"{env_var}={value} is not positive; falling back to {default}"
        )
        return default

    return value


MAX_UPLOAD_BYTES: int = _resolve_positive_int("MAX_UPLOAD_BYTES", _DEFAULT_MAX_UPLOAD_BYTES)
CHUNK_SIZE: int = _resolve_positive_int("CHUNK_SIZE", _DEFAULT_CHUNK_SIZE)


async def measure_upload(document: UploadFile) -> int:
    """
    Measure an upload in bytes, rejecting anything over the cap.

    Reads in fixed-size chunks and counts rather than materializing the whole
    body, and bails as soon as the running total exceeds the limit. Leaves the
    file rewound so the caller can extract text from it.

    :param document: The uploaded file.
    :return: Size of the upload in bytes.
    :raises HTTPException: 413 if the upload exceeds MAX_UPLOAD_BYTES.
    """
    total = 0

    while chunk := await document.read(CHUNK_SIZE):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            logger.warning(
                f"Rejected upload exceeding the {MAX_UPLOAD_BYTES} byte cap "
                f"(read {total} bytes before aborting)"
            )
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds the maximum upload size of {MAX_UPLOAD_BYTES} bytes",
            )

    await document.seek(0)
    return total


async def limit_request_body_size(request: Request, call_next):
    """
    HTTP middleware rejecting oversize requests on the declared Content-Length,
    before the body is read.

    This stops a large upload from being spooled to disk at all. It is a
    cheap first line only — a client can omit or understate Content-Length, so
    `measure_upload` remains the authoritative check.
    """
    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            declared = int(content_length)
        except ValueError:
            declared = None

        if declared is not None and declared > MAX_UPLOAD_BYTES:
            logger.warning(
                f"Rejected request declaring {declared} bytes, "
                f"over the {MAX_UPLOAD_BYTES} byte cap"
            )
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "detail": (
                        f"Request body exceeds the maximum upload size of "
                        f"{MAX_UPLOAD_BYTES} bytes"
                    )
                },
            )

    return await call_next(request)
