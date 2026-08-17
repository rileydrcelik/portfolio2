"""One-off: push every already-published art/photo post to Aiko.

The live pipeline only fires on save, so posts that predate it never reach Aiko
until something edits them. This walks the existing set once.

Safe to re-run. Aiko upserts on ``(source, sourceId)``, so a second pass updates
the pins the first pass created rather than duplicating them — which also makes
this the repair tool if a run dies partway.

    python backfill_aiko.py --dry-run          # list what would be pushed
    python backfill_aiko.py                    # push everything
    python backfill_aiko.py --limit 5          # try a handful first
    python backfill_aiko.py --category art

Deliberately sequential with a delay between posts: each push makes Aiko
download an image, run moderation, vector-search 1.9M pins for duplicates, and
queue a GPU embedding job. Firing all ~546 of those at once would be a
self-inflicted load test on a live app.
"""

import argparse
import asyncio
import logging
import sys
import time

from dotenv import load_dotenv

load_dotenv()

from app.database import SessionLocal          # noqa: E402
from app.models.post import Post               # noqa: E402
from app.lib import aiko_sync                  # noqa: E402

logging.basicConfig(level=logging.WARNING, format="%(message)s")


def parse_args():
    p = argparse.ArgumentParser(description="Backfill existing art/photo posts into Aiko")
    p.add_argument("--dry-run", action="store_true", help="list what would be pushed, push nothing")
    p.add_argument("--limit", type=int, default=None, help="only process the first N qualifying posts")
    p.add_argument("--category", default=None, help="restrict to one category (art or photo)")
    p.add_argument("--delay", type=float, default=1.5, help="seconds between pushes (default 1.5)")
    return p.parse_args()


async def main():
    args = parse_args()

    if not args.dry_run and not aiko_sync.is_configured():
        sys.exit("AIKO_INGEST_URL / AIKO_INGEST_SECRET are not set - nothing to push to.")

    db = SessionLocal()
    try:
        query = db.query(Post)
        if args.category:
            query = query.filter(Post.category == args.category)
        else:
            query = query.filter(Post.category.in_(sorted(aiko_sync.MIRRORED_CATEGORIES)))
        # Oldest first, so a partial run leaves a contiguous backlog rather than
        # a random scatter of done/not-done.
        posts = query.order_by(Post.date.asc()).all()

        # Snapshot inside the session; should_mirror is the same predicate the
        # live pipeline uses, so this pushes exactly the set that saving would.
        candidates = [s for s in (aiko_sync.snapshot(p) for p in posts) if aiko_sync.should_mirror(s)]
    finally:
        db.close()

    skipped = len(posts) - len(candidates)
    if args.limit:
        candidates = candidates[: args.limit]

    print(f"{len(posts)} posts in scope | {len(candidates)} to push | {skipped} skipped (no image / wrong type)")
    if not candidates:
        return

    if args.dry_run:
        for s in candidates:
            print(f"  [{s.category:5}] {(s.title or '(untitled)')[:48]:<50} {s.id}")
        print("\ndry run - nothing pushed")
        return

    counts = {"created": 0, "updated": 0, "failed": 0}
    failures = []
    started = time.time()

    for i, s in enumerate(candidates, 1):
        result = await aiko_sync.push_post(s)
        title = (s.title or "(untitled)")[:44]

        if result.get("ok"):
            action = result.get("action", "?")
            counts[action] = counts.get(action, 0) + 1
            print(f"  [{i:>3}/{len(candidates)}] {action:<8} {title:<46} -> {result.get('pin_id')}")
        else:
            counts["failed"] += 1
            err = str(result.get("error", ""))[:120]
            failures.append((s.id, title, err))
            print(f"  [{i:>3}/{len(candidates)}] FAILED   {title:<46} {err}")

        if i < len(candidates):
            await asyncio.sleep(args.delay)

    elapsed = time.time() - started
    print(f"\ndone in {elapsed / 60:.1f} min - "
          f"created {counts['created']}, updated {counts['updated']}, failed {counts['failed']}")

    if failures:
        print("\nfailures (re-run to retry; the upsert makes that safe):")
        for pid, title, err in failures:
            print(f"  {pid}  {title}\n      {err}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
