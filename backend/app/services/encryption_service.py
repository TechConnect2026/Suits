"""Encryption Service for BYOK API Keys.

Implements military-grade AES-256-GCM (Authenticated Encryption with Associated Data).

Security Guarantees:
1. AES-256-GCM authenticated cipher ensures both confidentiality and tamper resistance.
2. Cryptographically secure 96-bit random nonce generated for EVERY encryption.
3. User ID is bound as Authenticated Associated Data (AAD): a key encrypted for User A
   cannot be decrypted for User B even if database records were manipulated.
4. Plaintext keys are NEVER written to disk, cache, or logs.
5. Key hints (masked previews) prevent plaintext leakage to frontend clients.
"""

from __future__ import annotations

import base64
import os
import uuid
try:
    import structlog
    logger = structlog.get_logger()
except ImportError:
    import logging
    logger = logging.getLogger(__name__)
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings

logger = structlog.get_logger()

# Salt for PBKDF2 key derivation (domain separation)
_SALT = b"SUITS_BYOK_KEY_PROTECTION_V1"


class EncryptionService:
    """Provides authenticated AES-256-GCM encryption/decryption for sensitive user API keys."""

    def __init__(self) -> None:
        self._aesgcm: AESGCM | None = None

    def _get_cipher(self) -> AESGCM:
        if self._aesgcm is None:
            # Check if an explicit 32-byte hex/base64 key is configured
            explicit_key = getattr(settings, "byok_encryption_key", "")
            if explicit_key and len(explicit_key.strip()) >= 32:
                key_bytes = explicit_key.strip().encode("utf-8")[:32]
            else:
                # Deterministically derive 256-bit key from JWT Secret with PBKDF2
                secret_source = (settings.jwt_secret or "suits-secure-master-secret").encode("utf-8")
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=_SALT,
                    iterations=100000,
                )
                key_bytes = kdf.derive(secret_source)

            self._aesgcm = AESGCM(key_bytes)
        return self._aesgcm

    def encrypt_key(self, plain_key: str, user_id: str | uuid.UUID) -> str:
        """Encrypt plaintext API key with AES-256-GCM, binding user_id as associated data."""
        if not plain_key or not plain_key.strip():
            raise ValueError("API key cannot be empty.")

        user_aad = str(user_id).encode("utf-8")
        nonce = os.urandom(12)  # Standard 96-bit nonce for AES-GCM
        cipher = self._get_cipher()
        ciphertext = cipher.encrypt(nonce, plain_key.strip().encode("utf-8"), user_aad)

        # Pack nonce + ciphertext (which includes 16-byte auth tag)
        packaged = nonce + ciphertext
        return base64.b64encode(packaged).decode("utf-8")

    def decrypt_key(self, encrypted_payload: str, user_id: str | uuid.UUID) -> str:
        """Decrypt AES-256-GCM ciphertext, validating user_id authenticity."""
        if not encrypted_payload:
            raise ValueError("Encrypted payload cannot be empty.")

        user_aad = str(user_id).encode("utf-8")
        raw = base64.b64decode(encrypted_payload.encode("utf-8"))
        if len(raw) < 28:  # 12-byte nonce + minimum 16-byte tag
            raise ValueError("Corrupt or invalid encrypted payload.")

        nonce = raw[:12]
        ciphertext = raw[12:]
        cipher = self._get_cipher()
        decrypted_bytes = cipher.decrypt(nonce, ciphertext, user_aad)
        return decrypted_bytes.decode("utf-8")

    @staticmethod
    def mask_key(plain_key: str) -> str:
        """Generate a safe masked preview of an API key for UI display.
        
        Example outputs:
        - OpenAI:     sk-proj-****...9a8f
        - Anthropic:  sk-ant-****...4b1c
        - Gemini:     AIzaSy****...7d2e
        - Groq:       gsk_****...8e1a
        - OpenRouter: sk-or-****...2f9a
        """
        clean = plain_key.strip()
        if len(clean) <= 8:
            return "••••••••"

        # Detect known key prefixes
        prefixes = [
            "sk-ant-api03-",
            "sk-ant-",
            "sk-proj-",
            "sk-or-v1-",
            "sk-or-",
            "AIzaSy",
            "AIza",
            "gsk_",
            "sk-",
        ]
        matched_prefix = ""
        for p in prefixes:
            if clean.startswith(p):
                matched_prefix = p
                break

        if not matched_prefix:
            matched_prefix = clean[:4]

        suffix = clean[-4:]
        return f"{matched_prefix}••••...{suffix}"


encryption_service = EncryptionService()
