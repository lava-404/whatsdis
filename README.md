# Name That Shi

Point a camera at something, take one picture, and a neural network will tell you what it already was. Presented as a 2003 desktop application that is extremely pleased with itself.

Next.js frontend, FastAPI + YOLO backend.

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

Set `NEXT_PUBLIC_API_URL` to a URL the phone can actually reach, and add that frontend origin to `NTS_ALLOWED_ORIGINS` on the backend.

---

## How it works

```
 camera on  ──▶  live preview
                     │  press the shutter
                     ▼
        canvas.drawImage  ──▶  JPEG blob  ──▶  POST /detect
                                                    │
                                               YOLO inference
                                                    │
    boxes in image-pixel space  ◀──── JSON ◀─────────┘
             │
        projectBox() maps them onto the frozen still
             │
        absolutely positioned divs over the image
```

**One shot per request.** The still is displayed the instant the shutter fires, before the network has answered, so the frame you framed is the frame you keep looking at. Any request still in flight is aborted when you take a new shot, and nothing is sent while you are only composing.

Because a frozen still does not move, boxes land exactly where they belong — no smoothing, no persistence window, no strobing. The frame can also be larger than a streaming pipeline could afford (960px by default), so small objects survive.

**Coordinate scaling.** The backend answers in the pixel space of the image it was given. `lib/geometry.ts` maps that onto the displayed image's CSS box, accounting for `object-fit` (there's a toggle for contain vs cover), the centring offset, and the horizontal flip applied to a front-facing capture. A `ResizeObserver` keeps this correct through rotation, resizing, and the mobile URL bar collapsing.

---

## Things hidden in the menus

The menu bar is not decoration. About half of it does real work:

| Menu | Real | Not real |
| --- | --- | --- |
| File | New scan, Save snapshot as PNG (boxes burned in) | Print, Exit |
| Edit | Copy results to clipboard | Undo identification, Select all objects |
| View | Whole frame / Fill screen, CRT emulation toggle, Clear console | — |
| Scan | Camera on/off, Take the shot, Flip camera | Enhance |
| Help | — | Tip of the Day, Ask the model how it feels, Register this product, About |

Keyboard: **Space** takes the shot (and shoots again once a result is up), **Ctrl/Cmd+S** saves the annotated PNG. Neither fires while a control or text field has focus.

---

## Layout

```
frontend/
  app/                 layout, page, design tokens in globals.css
  components/
    ScannerProvider    all scanner state; the menu bar and the body share it
    Window, MenuBar, Button, Dialog, Taskbar, BootScreen
    CameraStage, DetectionOverlay, ConsolePanel, DetectionPanel, StatusStrip
  hooks/               useCamera, useAnalysis, useConsole
  lib/                 api, geometry, capture, export, config, copy
backend/
  main.py              FastAPI app — /health and /detect
  detector.py          YOLO wrapper; loaded once, run in a worker thread
  schemas.py           the wire format
  config.py            environment-driven settings
```

All user-facing wording lives in `lib/copy.ts`, so the voice can be rewritten without touching a component.

---

## Tuning

Frontend, in `.env.local`:

| Variable | Default | Effect |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Where the Python service lives |
| `NEXT_PUBLIC_CAPTURE_MAX_EDGE` | `960` | Longest edge of the uploaded JPEG |

Backend, in `.env` (all prefixed `NTS_`):

| Variable | Default | Effect |
| --- | --- | --- |
| `MODEL_PATH` | `yolov8n.pt` | Any ultralytics checkpoint. `yolov8s.pt` is slower and better |
| `DEVICE` | auto | `cpu`, `cuda`, `cuda:0`, `mps` |
| `CONFIDENCE_THRESHOLD` | `0.35` | Raise it if the overlay is noisy |
| `MAX_DETECTIONS` | `20` | Cap on boxes per image |
| `ALLOWED_ORIGINS` | localhost:3000 | CORS allowlist |

Since there is one request per shutter press rather than several per second, a heavier checkpoint is very affordable here. `yolov8s` or `yolov8m` on CPU costs a few hundred milliseconds per shot and noticeably improves what gets found.

---

## Accessibility and motion

The chrome is loud; the behaviour is not. Every control is a real button with a visible keyboard focus ring, menus close on Escape and outside clicks, the console is a polite live region, detection results are announced to screen readers, and `prefers-reduced-motion` disables the sweep, the shutter flash, the boot sequence, and every transition.
