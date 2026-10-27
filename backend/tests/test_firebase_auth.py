import asyncio
import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.lib import firebase_auth


def verify(allowed, email="someone@gmail.com"):
    with patch.dict(os.environ, {"FIREBASE_ALLOWED_EMAILS": allowed}), \
         patch.object(firebase_auth, "initialize_firebase_app"), \
         patch.object(firebase_auth.auth, "verify_id_token", return_value={"email": email}):
        return asyncio.run(firebase_auth.verify_firebase_token("Bearer token"))


class AllowlistTests(unittest.TestCase):
    def test_empty_allowlist_rejects_everyone(self):
        for allowed in ("", " , "):
            with self.assertRaises(HTTPException) as ctx:
                verify(allowed)
            self.assertEqual(ctx.exception.status_code, 403)
            self.assertIn("FIREBASE_ALLOWED_EMAILS", ctx.exception.detail)

    def test_email_not_on_allowlist_is_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            verify("admin@example.com", email="someone@gmail.com")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_allowlisted_email_is_accepted(self):
        token = verify("Admin@Example.com, other@example.com", email="admin@example.com")
        self.assertEqual(token["email"], "admin@example.com")


if __name__ == "__main__":
    unittest.main()
