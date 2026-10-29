import unittest
from types import SimpleNamespace

from pydantic import ValidationError

from app.lib import instagram_sync
from app.schemas.post import PostUpdate


def _post(**overrides):
    fields = dict(
        id="p1",
        title="Title",
        description="A walk by the water",
        instagram_hashtags=[],
    )
    fields.update(overrides)
    return SimpleNamespace(**fields)


class SchemaTests(unittest.TestCase):
    def test_hashtags_are_stored_bare_and_deduped(self):
        update = PostUpdate(instagram_hashtags=["#Film", "film", "nex-5n", " ", "golden hour"])
        self.assertEqual(update.instagram_hashtags, ["Film", "nex5n", "goldenhour"])

    def test_too_many_hashtags(self):
        with self.assertRaises(ValidationError):
            PostUpdate(instagram_hashtags=[f"tag{i}" for i in range(31)])


class CaptionTests(unittest.TestCase):
    def test_text_then_link_then_hashtags(self):
        caption = instagram_sync._caption(_post(instagram_hashtags=["film", "nyc"]), "https://aiko/pin/1")
        self.assertEqual(caption, "A walk by the water\n\nhttps://aiko/pin/1\n\n#film #nyc")

    def test_long_text_is_trimmed_not_the_tail(self):
        post = _post(description="x" * 3000, instagram_hashtags=["film"])
        caption = instagram_sync._caption(post, "https://aiko/pin/1")
        self.assertEqual(len(caption), instagram_sync.MAX_CAPTION)
        self.assertTrue(caption.endswith("https://aiko/pin/1\n\n#film"))


if __name__ == "__main__":
    unittest.main()
