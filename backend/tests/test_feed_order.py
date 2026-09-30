import unittest
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, MetaData, String, Table, create_engine, select

from app.lib.feed_order import feed_ordering

meta = MetaData()
posts = Table(
    "posts", meta,
    Column("id", Integer, primary_key=True),
    Column("post_type", String, nullable=True),
    Column("date", DateTime),
    Column("updated_at", DateTime),
)

ROWS = [
    # id, post_type, date, updated_at
    (1, "photo", datetime(2026, 9, 1), datetime(2026, 9, 1)),
    (2, "now_playing", datetime(2026, 1, 1), datetime(2026, 1, 1)),  # oldest
    (3, None, datetime(2026, 9, 30), datetime(2026, 2, 1)),          # newest, NULL type
    (4, "note", datetime(2026, 5, 1), datetime(2026, 9, 29)),
]


class FeedOrderingTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        meta.create_all(self.engine)
        with self.engine.begin() as conn:
            conn.execute(posts.insert(), [
                dict(id=i, post_type=t, date=d, updated_at=u) for i, t, d, u in ROWS
            ])

    def tearDown(self):
        self.engine.dispose()

    def ids(self, **kwargs):
        with self.engine.connect() as conn:
            q = select(posts.c.id).order_by(*feed_ordering(posts.c, **kwargs))
            return [r[0] for r in conn.execute(q)]

    def test_unpinned_is_newest_first(self):
        self.assertEqual(self.ids(), [3, 1, 4, 2])

    def test_pinned_puts_now_playing_first_then_newest(self):
        self.assertEqual(self.ids(pin_now_playing=True), [2, 3, 1, 4])

    def test_pinned_respects_updated_at_sort(self):
        self.assertEqual(self.ids(pin_now_playing=True, sort_by="updated_at"), [2, 4, 1, 3])

    def test_pin_key_is_never_null(self):
        # Postgres sorts NULLs first under DESC; a NULL post_type must still get
        # a real key, or it would outrank the pinned card there.
        key = feed_ordering(posts.c, pin_now_playing=True)[0]
        with self.engine.connect() as conn:
            keys = dict(conn.execute(select(posts.c.id, key)).all())
        self.assertEqual(keys, {1: 1, 2: 0, 3: 1, 4: 1})


if __name__ == "__main__":
    unittest.main()
