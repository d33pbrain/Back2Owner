"""Main FastAPI application entrypoint for Back2Owner Document Verification."""

import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.security import PIIRedactionFilter
from app.api.routes import router


def setup_logging():
    """Configure structured logging with strict PII redaction."""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO if not settings.DEBUG else logging.DEBUG)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "[%(asctime)s] [%(levelname)s] [%(name)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # Attach privacy scrubber
    if settings.MASK_PII_IN_LOGS:
        handler.addFilter(PIIRedactionFilter())

    logger.handlers.clear()
    logger.addHandler(handler)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager."""
    setup_logging()
    app_logger = logging.getLogger("back2owner.startup")
    app_logger.info(
        f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION} "
        f"[Env: {settings.ENVIRONMENT}, OCR: {settings.OCR_ENGINE}]"
    )

    yield

    app_logger.info(f"Shutting down {settings.SERVICE_NAME}...")


app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description=(
        "Production student document verification service for Back2Owner. "
        "Assesses image quality, performs non-destructive preprocessing, extracts text "
        "via PaddleOCR, and fuzzy matches student credentials."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors cleanly without exposing internal details."""
    errors = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        errors.append(f"{loc}: {err.get('msg', 'Invalid input')}")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "message": "Submitted form data or file failed schema validation.",
            "details": errors,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors securely without leaking stack traces or PII."""
    app_logger = logging.getLogger("back2owner.error")
    app_logger.error(f"Unhandled exception processing request {request.url.path}: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Processing Error",
            "message": "An unexpected error occurred while verifying the document. Please try again later.",
        },
    )


# Register routes
app.include_router(router)
