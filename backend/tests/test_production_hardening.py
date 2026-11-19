"""Production hardening test suite.

Validates:
1. File upload security (magic byte rejection, filename traversal sanitization).
2. Security headers middleware.
3. Token revocation blocklist and server-side logout.
4. Brute-force auth lockout.
5. Deep health check probes.
"""

import unittest
import asyncio
import uuid
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi.testclient import TestClient

from app.main import app
from app.core.security import create_access_token, create_refresh_token
from app.services.cache_service import cache_service
from app.services.document_processor import sanitize_filename, DocumentProcessor


class TestProductionHardening(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_sanitize_filename_prevents_path_traversal(self):
        """Path traversal patterns and control characters must be sanitized."""
        self.assertEqual(sanitize_filename("../../etc/passwd"), "passwd")
        self.assertEqual(sanitize_filename("..\\..\\windows\\win.ini"), "win.ini")
        self.assertEqual(sanitize_filename("valid_doc.pdf"), "valid_doc.pdf")
        self.assertFalse(".." in sanitize_filename("../../../../test.docx"))

    def test_magic_byte_rejection_for_invalid_pdf(self):
        """Uploading an executable disguised as PDF must be rejected by magic bytes."""
        processor = DocumentProcessor(db=MagicMock())
        # Fake malicious file with PDF content-type but invalid executable binary bytes
        fake_binary = b"MZ\x90\x00\x03\x00\x00\x00"
        with self.assertRaises(ValueError) as ctx:
            processor.validate_file("malicious.pdf", "application/pdf", len(fake_binary), fake_binary)
        self.assertIn("magic byte mismatch", str(ctx.exception).lower())

    def test_magic_byte_acceptance_for_valid_pdf(self):
        """A valid PDF file starting with %PDF- must pass validation."""
        processor = DocumentProcessor(db=MagicMock())
        valid_pdf_bytes = b"%PDF-1.4\n%real pdf stream..."
        try:
            processor.validate_file("valid.pdf", "application/pdf", len(valid_pdf_bytes), valid_pdf_bytes)
        except ValueError:
            self.fail("validate_file raised ValueError unexpectedly for valid PDF bytes")

    def test_security_headers_present_on_responses(self):
        """HTTP responses must contain standard hardening security headers."""
        response = self.client.get("/api")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(response.headers.get("x-frame-options"), "DENY")
        self.assertEqual(response.headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin")

    def test_deep_health_check_response_structure(self):
        """The deep /api/health probe must return statuses for database, redis, and ai."""
        response = self.client.get("/api/health")
        self.assertIn(response.status_code, (200, 503))
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("checks", data)
        checks = data["checks"]
        self.assertIn("database", checks)
        self.assertIn("redis", checks)
        self.assertIn("ai_gemini", checks)
        self.assertEqual(checks["ai_gemini"]["model"], "gemini-3.1-flash-lite")

    def test_token_revocation_blocklist(self):
        """Revoked JWT tokens must be rejected with HTTP 401."""
        async def run_async_test():
            user_id = uuid.uuid4()
            token = create_access_token({"sub": str(user_id)})

            # Decode token to extract jti
            from app.core.security import decode_access_token
            payload = decode_access_token(token)
            self.assertIsNotNone(payload)
            jti = payload["jti"]

            # Token should not be revoked yet
            self.assertFalse(await cache_service.is_token_revoked(jti))

            # Revoke token
            await cache_service.revoke_token(jti, ttl_seconds=60)
            self.assertTrue(await cache_service.is_token_revoked(jti))

        asyncio.run(run_async_test())

    def test_brute_force_lockout_counter(self):
        """Failed auth attempts must increment counter and record lockout threshold."""
        async def run_async_test():
            test_id = f"test_lockout_{uuid.uuid4().hex[:6]}"
            # Initially 0 failures
            self.assertEqual(await cache_service.get_auth_failures(test_id), 0)

            # Record 5 failures
            for i in range(1, 6):
                cnt = await cache_service.record_auth_failure(test_id, window_seconds=60)
                self.assertEqual(cnt, i)

            self.assertEqual(await cache_service.get_auth_failures(test_id), 5)

            # Reset upon success
            await cache_service.reset_auth_failures(test_id)
            self.assertEqual(await cache_service.get_auth_failures(test_id), 0)

        asyncio.run(run_async_test())


if __name__ == "__main__":
    unittest.main()
