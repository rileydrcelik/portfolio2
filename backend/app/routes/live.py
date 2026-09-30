"""Live audio from the mariposa phone; see app/lib/live_relay.py.

The phone publishes over a WebSocket with the same secret as the presence
ingest. Listening is public: a playlist and its segments, read by the
now-playing card's Listen control.
"""

import os
import time

from fastapi import APIRouter, HTTPException, Response, WebSocket, WebSocketDisconnect

from app.lib.live_relay import BadFormat, Relay, secret_check

router = APIRouter(prefix="/api/live", tags=["live"])

# The one relay in this process. See the note on processes in live_relay.py.
relay = Relay(first_seq=int(time.time()))

CLOSE_BAD_FORMAT = 4400
CLOSE_REJECTED = 4401
CLOSE_REPLACED = 4409
CLOSE_UNCONFIGURED = 4503


@router.websocket("/ingest")
async def ingest(ws: WebSocket):
    """The phone's stream: binary messages of ADTS frames."""
    check = secret_check(ws.headers.get("x-ingest-secret"), os.getenv("PRESENCE_INGEST_SECRET", ""))
    await ws.accept()
    if check != "ok":
        await ws.close(code=CLOSE_UNCONFIGURED if check == "unconfigured" else CLOSE_REJECTED)
        return

    token = relay.connect(time.monotonic())
    # Relay state lives in this process, so a second worker would serve 404s;
    # the pid in the log is how that shows up.
    print(f"[live] publisher {token} connected (pid {os.getpid()})", flush=True)
    try:
        while True:
            message = await ws.receive()
            if message["type"] == "websocket.disconnect":
                break
            if not relay.is_current(token):
                await ws.close(code=CLOSE_REPLACED)
                break
            data = message.get("bytes")
            if data:
                try:
                    relay.feed(token, data, time.monotonic())
                except BadFormat as exc:
                    print(f"[live] unexpected audio format {exc}", flush=True)
                    await ws.close(code=CLOSE_BAD_FORMAT)
                    break
    except WebSocketDisconnect:
        pass
    finally:
        relay.disconnect(token, time.monotonic())
        print(f"[live] publisher {token} disconnected", flush=True)


@router.get("/live.m3u8")
async def playlist():
    body = relay.playlist(time.monotonic())
    if body is None:
        raise HTTPException(status_code=404, detail="Not live")
    return Response(
        content=body,
        media_type="application/vnd.apple.mpegurl",
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/seg/{seq}.aac")
async def segment(seq: int):
    data = relay.segment(seq)
    if data is None:
        raise HTTPException(status_code=404, detail="No such segment")
    return Response(content=data, media_type="audio/aac", headers={"Cache-Control": "max-age=60"})
