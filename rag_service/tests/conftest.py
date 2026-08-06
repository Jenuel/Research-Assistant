import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault(
    "CLERK_JWKS_URL", "https://example.clerk.accounts.dev/.well-known/jwks.json"
)
os.environ.setdefault("CLERK_ISSUER", "https://example.clerk.accounts.dev")
os.environ.setdefault("CLERK_AUTHORIZED_PARTIES", "http://localhost:3000")
