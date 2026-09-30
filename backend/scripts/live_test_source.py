"""Streams an ADTS file to the live relay the way the phone will, for testing
the relay and the listening side without a phone.

Make a file in the relay's format first:

    ffmpeg -i song.mp3 -ar 48000 -ac 2 -c:a aac -b:a 128k -f adts song.aac

Then, from backend/:

    venv/Scripts/python scripts/live_test_source.py song.aac \
        --url ws://127.0.0.1:8001/api/live/ingest --secret <PRESENCE_INGEST_SECRET>

Frames go out in real time (1024 samples at 48 kHz each), batched about every
100 ms like the phone does. --loop repeats the file; --drop-after N closes
the socket after N seconds, to try a network drop.
"""

import argparse
import asyncio
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import websockets  # noqa: E402

from app.lib.live_relay import SAMPLE_RATE, SAMPLES_PER_FRAME, is_expected_format, split_adts  # noqa: E402

BATCH_SECONDS = 0.1


async def stream(path: str, url: str, secret: str, loop: bool, drop_after: float) -> None:
    with open(path, "rb") as f:
        frames, _ = split_adts(f.read())
    if not frames:
        sys.exit("No ADTS frames in that file.")
    if not is_expected_format(frames[0]):
        sys.exit("Not 48 kHz stereo AAC-LC; see the ffmpeg line at the top of this script.")
    frame_seconds = SAMPLES_PER_FRAME / SAMPLE_RATE
    per_batch = max(1, round(BATCH_SECONDS / frame_seconds))
    print(f"{len(frames)} frames, {len(frames) * frame_seconds:.0f} s of audio")

    async with websockets.connect(url, additional_headers={"X-Ingest-Secret": secret}) as ws:
        start = time.monotonic()
        sent = 0
        while True:
            for i in range(0, len(frames), per_batch):
                batch = frames[i : i + per_batch]
                await ws.send(b"".join(batch))
                sent += len(batch)
                if drop_after and time.monotonic() - start > drop_after:
                    print("Dropping the connection.")
                    return
                # Keep to real time: wait until the audio sent so far is due.
                ahead = sent * frame_seconds - (time.monotonic() - start)
                if ahead > 0:
                    await asyncio.sleep(ahead)
            if not loop:
                break
        print(f"Sent {sent} frames in {time.monotonic() - start:.0f} s.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("file")
    parser.add_argument("--url", default="ws://127.0.0.1:8001/api/live/ingest")
    parser.add_argument("--secret", default=os.getenv("PRESENCE_INGEST_SECRET", ""))
    parser.add_argument("--loop", action="store_true")
    parser.add_argument("--drop-after", type=float, default=0)
    args = parser.parse_args()
    asyncio.run(stream(args.file, args.url, args.secret, args.loop, args.drop_after))


if __name__ == "__main__":
    main()
