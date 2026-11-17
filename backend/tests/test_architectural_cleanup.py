"""Regression tests for architectural consolidation & cleanup."""

import importlib
import json
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from app.main import app
from app.schemas.precedents import VerdictAnatomyRequest
from app.services.verdict_anatomy_service import VerdictAnatomyService


class TestArchitecturalCleanup(unittest.IsolatedAsyncioTestCase):

    def test_openapi_schema_builds_cleanly(self):
        schema = app.openapi()
        self.assertIn("paths", schema)
        paths = set(schema["paths"].keys())

        # Canonical era-transition routes remain on /api/cases
        self.assertIn("/api/cases/{cnr}/era-transition", paths)
        self.assertIn("/api/cases/{cnr}/era-transition/refresh", paths)
        self.assertIn("/api/cases/{cnr}/era-transition/instant", paths)

        # Duplicate era-transition routes removed from /api/statutes
        self.assertNotIn("/api/statutes/cases/{cnr}/era-transition", paths)
        self.assertNotIn("/api/statutes/cases/{cnr}/era-transition/refresh", paths)

        # Statutory lookup routes remain intact
        self.assertIn("/api/statutes/era-transition/lookup", paths)
        self.assertIn("/api/statutes/era-transition/verbatim-diff/{pair_id}", paths)

        # eCourts reference routes completely removed
        self.assertNotIn("/api/cases/reference/court-structure", paths)
        self.assertNotIn("/api/cases/reference/enums", paths)
        self.assertNotIn("/api/cases/reference/available-dates", paths)
        self.assertNotIn("/api/cases/reference/cause-list", paths)

    def test_removed_modules_not_importable(self):
        for mod in (
            "app.clients.groq_client",
            "app.clients.ecourts_client",
            "app.services.ecourts_service",
        ):
            with self.assertRaises(ModuleNotFoundError):
                importlib.import_module(mod)

    async def test_verdict_anatomy_reuses_cached_order_ai_without_llm_call(self):
        """VerdictAnatomyService must reuse cached OrderService AI JSON when present (zero extra LLM calls)."""
        service = VerdictAnatomyService()
        cached_payload = {
            "extractionConfidence": 0.94,
            "caseTitle": "State of Punjab v. Gurmit Singh",
            "courtName": "Supreme Court of India",
            "orderDate": "2024-08-12",
            "judges": ["Justice A. B. Roy", "Justice C. D. Nair"],
            "ratio_decidendi": "Procedural safeguards under Section 105 BNSS are mandatory during search and seizure.",
            "legal_issues": [
                {"issue": "Whether non-videography vitiates seizure under BNSS 105?", "holding": "Mandatory compliance required.", "answered_in_favour_of": "Petitioner"}
            ],
            "material_facts": ["Search conducted without electronic recording."],
            "obiter_dicta": ["Investigating agencies must modernize digital evidence workflows."],
            "statutes_cited": ["BNSS Section 105"],
            "plainLanguageSummary": "Police must record searches on video under BNSS Section 105.",
            "disposition": "Appeal Allowed",
        }
        fake_cached_row = SimpleNamespace(ai_json=json.dumps(cached_payload))

        with patch("app.repositories.cache_repository.CacheRepository.get_latest_cached_ai_for_cnr", new_callable=AsyncMock) as mock_cache, \
             patch.object(service.orchestrator, "generate_text", new_callable=AsyncMock) as mock_llm:
            mock_cache.return_value = fake_cached_row

            res = await service.get_verdict_anatomy(
                VerdictAnatomyRequest(cnr="123456", case_title="State of Punjab v. Gurmit Singh"),
                db=object(),
            )

            mock_cache.assert_awaited_once_with("123456")
            mock_llm.assert_not_called()
            self.assertEqual(res.case_title, "State of Punjab v. Gurmit Singh")
            self.assertEqual(res.court_name, "Supreme Court of India")
            self.assertIn("Section 105 BNSS", res.ratio_decidendi.core_rule_of_law)
            self.assertEqual(res.ratio_decidendi.precedential_weight, "Binding Supreme Court Precedent")
            self.assertEqual(len(res.issues_framed), 1)
            self.assertEqual(res.issues_framed[0].answered_in_favour_of, "Petitioner")


if __name__ == "__main__":
    unittest.main()
