# WhatsDis

Real-time object detection in the browser, presented as a 2003 desktop application that is extremely pleased with itself.

Next.js frontend, FastAPI + YOLO backend. The browser captures frames from the camera, posts them to Python, and draws labelled boxes over the live preview.

---

## Running it

Two terminals. Camera access requires `localhost` or HTTPS — the browser will refuse on a plain `http://` LAN address.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # optional
uvicorn main:app --reload --port 8000
```

The first start downloads `yolov8n.pt` (about 6 MB) and runs one warm-up inference, so give it a few seconds before the frontend reports a neural link.

Check it: `curl http://localhost:8000/health`

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000.

### Or with Docker

```bash
docker compose up --build
```

---

## Testing on a phone

Phones will not grant camera access over plain HTTP. Either:

- run `npx localtunnel --port 3000` (or ngrok, or Cloudflare Tunnel) and open the HTTPS URL, or
- point the phone at a dev machine serving HTTPS with a trusted certificate.

Set `NEXT_PUBLIC_API_URL` to a URL the phone can actually reach, and add that frontend origin to `WHATSDIS_ALLOWED_ORIGINS` on the backend.

---

## How detection works

```
 <video>  ──▶  canvas.drawImage  ──▶  JPEG blob  ──▶  POST /detect
                                                           │
                                                      YOLO inference
                                                           │
   boxes in frame-pixel space  ◀────── JSON ◀───────────────┘
        │
   projectBox() maps them onto the rendered <video> box
        │
   absolutely positioned divs over the preview
```

**Throttling.** `useDetectionLoop` captures the next frame only after the previous response lands, and never sooner than `NEXT_PUBLIC_DETECT_INTERVAL_MS` after the previous one started. Exactly one request is ever in flight, so a slow backend degrades into a lower frame rate rather than a queue of stale frames. The loop also idles while the tab is hidden and backs off progressively when requests fail.

**Coordinate scaling.** The backend answers in the pixel space of the frame it was given. `lib/geometry.ts` maps that onto the `<video>` element's CSS box, accounting for `object-fit` (`contain` letterboxes, `cover` crops), the centring offset, and the horizontal flip applied to the front-facing preview. A `ResizeObserver` on the overlay keeps this correct through rotation, resizing, and the mobile URL bar collapsing.

**Flicker.** YOLO drops a confidently-detected object for the odd frame. `useDetectionBuffer` holds each box for `DETECTION_TTL_MS` past its last confirmation and fades it, so boxes settle instead of strobing.

---

## Layout

```
frontend/
  app/            layout, page, design tokens in globals.css
  components/     Window, Button, Dialog chrome + the scanner itself
  hooks/          useCamera, useDetectionLoop, useDetectionBuffer, useConsole
  lib/            api client, geometry, frame capture, config, copy
backend/
  main.py         FastAPI app — /health and /detect
  detector.py     YOLO wrapper; loaded once, run in a worker thread
  schemas.py      the wire format
  config.py       environment-driven settings
```

All user-facing wording lives in `lib/copy.ts`, so the voice can be rewritten without touching a component.

---

## Tuning

Frontend, in `.env.local`:

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Where the Python service lives |
| `NEXT_PUBLIC_DETECT_INTERVAL_MS` | `250` | Minimum gap between frames. Raise on slow hardware |
| `NEXT_PUBLIC_CAPTURE_MAX_EDGE` | `640` | Longest edge of the uploaded JPEG |

Backend, in `.env` (all prefixed `WHATSDIS_`):

| Variable | Default | Effect |
| --- | --- | --- |
| `MODEL_PATH` | `yolov8n.pt` | Any ultralytics checkpoint. `yolov8s.pt` is slower and better |
| `DEVICE` | auto | `cpu`, `cuda`, `cuda:0`, `mps` |
| `CONFIDENCE_THRESHOLD` | `0.35` | Raise it if the overlay is noisy |
| `MAX_DETECTIONS` | `20` | Cap on boxes per frame |
| `ALLOWED_ORIGINS` | localhost:3000 | CORS allowlist |

On CPU, `yolov8n` at 640px runs roughly 60–150 ms per frame, which the default 250 ms interval sits comfortably above. With a GPU you can drop the interval to about 100 ms.

---

## Accessibility and motion

The chrome is loud; the behaviour is not. Every control is a real button with a visible keyboard focus ring, the console is a polite live region, detection results are announced to screen readers, and `prefers-reduced-motion` disables the sweep, the boot sequence, and every transition.
