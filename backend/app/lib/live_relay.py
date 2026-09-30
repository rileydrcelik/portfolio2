"""Live audio from the mariposa phone, relayed to the site as HLS.

The phone sends AAC over a WebSocket, as ADTS frames (48 kHz, stereo, LC).
Here they are cut into ~2 s segments and listed in a sliding playlist, which
Safari plays natively and hls.js plays everywhere else. HLS rather than one
endless audio response: Railway cuts an HTTP response at 15 minutes, and an
HLS player only ever makes short requests.

Everything is held in memory, in this process. That needs the backend to run
as one process (one uvicorn worker, one replica): a second one would have no
segments and answer 404.

Kept free of FastAPI so it can be tested on its own; see routes/live.py.
"""

from collections import deque
from dataclasses import dataclass
from typing import Deque, List, Optional, Tuple

import secrets

SAMPLE_RATE = 48000
SAMPLES_PER_FRAME = 1024
# The ADTS header's sampling-frequency index for 48 kHz.
SF_INDEX_48K = 3
CHANNELS = 2
# ADTS "profile" is the object type minus one: 1 is AAC-LC.
PROFILE_LC = 1

# 94 frames of 1024 samples is 2.005 s.
FRAMES_PER_SEGMENT = 94
SEGMENT_SECONDS = FRAMES_PER_SEGMENT * SAMPLES_PER_FRAME / SAMPLE_RATE
# One AAC frame on the 90 kHz clock HLS timestamps use.
TICKS_PER_FRAME = SAMPLES_PER_FRAME * 90000 // SAMPLE_RATE
PTS_MASK = (1 << 33) - 1

LISTED_SEGMENTS = 6
# The spec wants a segment kept for its own length plus the playlist's after
# it leaves the list, for a slow player: 7 more, so 13 in all.
KEPT_SEGMENTS = 13
# Listening only starts once a few segments exist, so a player has something
# to buffer rather than stalling on its first request.
MIN_SEGMENTS_LIVE = 3
# How long a dropped or silent phone still counts as live, so a reconnect is
# seamless. The phone sends silence while paused, so a connected phone that
# sends nothing for this long has stalled.
GRACE_SECONDS = 10.0

ID3_OWNER = b"com.apple.streaming.transportStreamTimestamp"


def split_adts(buf: bytes) -> Tuple[List[bytes], bytes]:
    """Splits `buf` into whole ADTS frames and the unfinished tail.

    Skips bytes until a sync word, so a corrupt or truncated frame costs
    itself and not the rest of the stream.
    """
    frames: List[bytes] = []
    i = 0
    n = len(buf)
    while i + 7 <= n:
        if buf[i] != 0xFF or (buf[i + 1] & 0xF6) != 0xF0:
            i += 1
            continue
        length = ((buf[i + 3] & 0x03) << 11) | (buf[i + 4] << 3) | (buf[i + 5] >> 5)
        header = 7 if buf[i + 1] & 0x01 else 9
        if length <= header:
            i += 1
            continue
        if i + length > n:
            break
        frames.append(bytes(buf[i : i + length]))
        i += length
    return frames, bytes(buf[i:])


def adts_format(frame: bytes) -> Tuple[int, int, int]:
    """(profile, sampling-frequency index, channel configuration) of a frame."""
    profile = frame[2] >> 6
    sf_index = (frame[2] >> 2) & 0x0F
    channels = ((frame[2] & 0x01) << 2) | (frame[3] >> 6)
    return profile, sf_index, channels


def is_expected_format(frame: bytes) -> bool:
    # One raw data block per frame too: the timing assumes 1024 samples a frame.
    return adts_format(frame) == (PROFILE_LC, SF_INDEX_48K, CHANNELS) and frame[6] & 0x03 == 0


def _syncsafe(value: int) -> bytes:
    return bytes([(value >> 21) & 0x7F, (value >> 14) & 0x7F, (value >> 7) & 0x7F, value & 0x7F])


def id3_timestamp(pts: int) -> bytes:
    """The ID3 tag Apple requires at the head of a packed-audio segment,
    giving the timestamp of its first sample on the 90 kHz clock."""
    data = ID3_OWNER + b"\x00" + (pts & PTS_MASK).to_bytes(8, "big")
    frame = b"PRIV" + _syncsafe(len(data)) + b"\x00\x00" + data
    return b"ID3\x04\x00\x00" + _syncsafe(len(frame)) + frame


@dataclass(frozen=True)
class Segment:
    seq: int
    pts: int
    frames: int
    data: bytes

    @property
    def duration(self) -> float:
        return self.frames * SAMPLES_PER_FRAME / SAMPLE_RATE


class Segmenter:
    """Frames in, segments out. Frame and segment numbers only ever grow,
    across reconnects too, which is what keeps the playlist's timeline
    continuous for a player that is already listening."""

    def __init__(self, first_seq: int = 0) -> None:
        self.next_seq = first_seq
        self.frame_count = 0
        self._pending: List[bytes] = []
        self._first_frame = 0

    def push(self, frames: List[bytes]) -> List[Segment]:
        out: List[Segment] = []
        for frame in frames:
            if not self._pending:
                self._first_frame = self.frame_count
            self._pending.append(frame)
            self.frame_count += 1
            if len(self._pending) == FRAMES_PER_SEGMENT:
                out.append(self._cut())
        return out

    def drop_pending(self) -> None:
        self._pending = []

    def _cut(self) -> Segment:
        pts = (self._first_frame * TICKS_PER_FRAME) & PTS_MASK
        segment = Segment(
            seq=self.next_seq,
            pts=pts,
            frames=len(self._pending),
            data=id3_timestamp(pts) + b"".join(self._pending),
        )
        self.next_seq += 1
        self._pending = []
        return segment


def render_playlist(segments: List[Segment], ended: bool) -> str:
    """A live HLS playlist of `segments`, oldest first; closed if `ended`."""
    lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:3",
        # EXTINF rounded to the nearest second must not exceed this. Half up,
        # not Python's round(), which rounds a half to even.
        f"#EXT-X-TARGETDURATION:{int(SEGMENT_SECONDS + 0.5)}",
        f"#EXT-X-MEDIA-SEQUENCE:{segments[0].seq if segments else 0}",
    ]
    for segment in segments:
        lines.append(f"#EXTINF:{segment.duration:.3f},")
        lines.append(f"seg/{segment.seq}.aac")
    if ended:
        lines.append("#EXT-X-ENDLIST")
    return "\n".join(lines) + "\n"


def secret_check(provided: Optional[str], expected: str) -> str:
    """'ok', 'unconfigured' (no secret set: the endpoint is off) or 'rejected'."""
    if not expected:
        return "unconfigured"
    if not provided or not secrets.compare_digest(provided, expected):
        return "rejected"
    return "ok"


def listen_available(state: str, live: bool) -> bool:
    """Whether the card offers Listen: only while live, and never while the
    phone has sharing switched off."""
    return live and state != "hidden"


class BadFormat(Exception):
    """The phone sent audio this relay does not handle."""


class Relay:
    """One phone publishing, any number of listeners reading.

    `first_seq` numbers the first segment. The route seeds it from the clock,
    so segment numbers do not start over at 0 when the process restarts and a
    listener's cached `seg/0.aac` is not mistaken for a new one.
    """

    def __init__(self, first_seq: int = 0) -> None:
        self._token: Optional[int] = None
        self._next_token = 1
        self._disconnected_at: Optional[float] = None
        # When the connected phone was last heard from: its connect, or its
        # latest audio.
        self._heard_at = 0.0
        # The phone has sharing switched off; nothing is served meanwhile.
        self._hidden = False
        self._segmenter = Segmenter(first_seq)
        self._segments: Deque[Segment] = deque(maxlen=KEPT_SEGMENTS)
        self._rest = b""

    def connect(self, now: float) -> int:
        """A phone connected. It replaces any earlier one: the phone that
        reconnects after a network change must not wait for the dead socket
        to time out."""
        if not self._publishing(now):
            # A new session: nothing from the last one is still worth hearing.
            self._segments.clear()
            self._segmenter.drop_pending()
        self._rest = b""
        token = self._next_token
        self._next_token += 1
        self._token = token
        self._disconnected_at = None
        self._heard_at = now
        return token

    def disconnect(self, token: int, now: float) -> None:
        # A replaced connection closing late must not end the new one.
        if token == self._token:
            self._token = None
            self._disconnected_at = now

    def is_current(self, token: int) -> bool:
        return token == self._token

    def set_hidden(self, hidden: bool) -> None:
        """Follows the phone's sharing switch, from the presence ingest."""
        self._hidden = hidden

    def feed(self, token: int, data: bytes, now: float) -> None:
        """Takes ADTS bytes from the phone. Raises BadFormat on audio that is
        not 48 kHz stereo AAC-LC. Ignores a replaced connection."""
        if token != self._token:
            return
        # The tail is never longer than one frame (at most 8191 bytes), so it
        # needs no cap of its own.
        frames, self._rest = split_adts(self._rest + data)
        for frame in frames:
            if not is_expected_format(frame):
                raise BadFormat(adts_format(frame))
        if frames:
            self._heard_at = now
        self._segments.extend(self._segmenter.push(frames))

    def _publishing(self, now: float) -> bool:
        if self._token is not None:
            return now - self._heard_at < GRACE_SECONDS
        return self._disconnected_at is not None and now - self._disconnected_at < GRACE_SECONDS

    def is_live(self, now: float) -> bool:
        return not self._hidden and self._publishing(now) and len(self._segments) >= MIN_SEGMENTS_LIVE

    def playlist(self, now: float) -> Optional[str]:
        """The playlist, or None if there is nothing to play."""
        if self._hidden or not self._segments:
            return None
        listed = list(self._segments)[-LISTED_SEGMENTS:]
        return render_playlist(listed, ended=not self._publishing(now))

    def segment(self, seq: int) -> Optional[bytes]:
        if self._hidden:
            return None
        for segment in self._segments:
            if segment.seq == seq:
                return segment.data
        return None
