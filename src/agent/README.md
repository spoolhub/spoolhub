# SpoolHub Agent

A lightweight Windows desktop application that bridges your USB NFC reader to the SpoolHub web interface. It runs in the background on your PC, reads NFC tags via PC/SC, and pushes scan events to the SpoolHub browser tab over a local WebSocket connection.

---

## Why it exists

SpoolHub runs inside Docker. Docker cannot access USB devices (like an NFC reader) plugged into your Windows PC. The agent solves this by running natively on your machine — where it can read the NFC reader — and forwarding tag scans to the browser over `localhost`.

```
    Your PC
 ┌─────────────────────────────────────────────┐
 │                                             │
 │   ┌─────────────┐   PC/SC    ┌───────────┐  │
 │   │  USB NFC    │ ─────────► │  SpoolHub │  │
 │   │  Reader     │            │  Agent    │  │
 │   └─────────────┘            │ :8765     │  │
 │                              └─────┬─────┘  │
 │   ┌─────────────┐        WebSocket │        │
 │   │   Browser   │ ◄────────────────┘        │
 │   │  (Scan page)│                           │
 │   └──────┬──────┘                           │
 └──────────┼──────────────────────────────────┘
            |
            │ HTTP POST /api/nfc-tags/scan
            │
 ┌──────────▼─────────────────────────────────┐
 │  Docker                                    │
 │   ┌─────────────────────────────────────┐  │
 │   │  SpoolHub Backend          :4848    │  │
 │   └─────────────────────────────────────┘  │
 └────────────────────────────────────────────┘
```

---

## Installation

The agent is distributed as a self-contained Windows installer (`SpoolHubAgent-Setup.exe`).

**Automatic (recommended):**
1. Open SpoolHub in your browser
2. Go to the **Scan** page
3. SpoolHub detects the agent is not running and shows an install prompt
4. Click **Download Agent** — the installer downloads and launches automatically
5. After install, SpoolHub connects to the agent within a few seconds

**Manual:**
Download `SpoolHubAgent-Setup.exe` from the [latest GitHub release](https://github.com/spoolhub/spoolhub/releases/latest) and run it.

---

## Supported platforms

| Platform | Status | PC/SC requirement |
|---|---|---|
| Windows 10 / 11 (x64) | Supported | Built-in — no setup needed |
| macOS 12+ (Intel + Apple Silicon) | Supported | Built-in via CryptoTokenKit |
| Linux (x64, ARM64) | Supported | Install `pcscd`: `sudo apt install pcscd && sudo systemctl enable --now pcscd` |
| Raspberry Pi (ARM64) | Supported | Same as Linux |

The agent is distributed as a self-contained single-file binary — no .NET runtime installation needed on any platform.

---

## Supported NFC readers

Any USB reader that exposes a standard PC/SC interface works. Tested models:

| Reader | Notes |
|---|---|
| ACR122U | Most common, recommended |
| SCL3711 | Compact USB dongle |
| OmniKey 5321 | |
| Feitian R502 | |
| NXP OM5577 | |
| SpringCard Prox'N'Roll | |
| Bit4ID miniLector | |

No extra drivers needed on Windows 10/11 or macOS. On Linux install `libpcsclite1`.

---

## Supported NFC tags

| Tag | Notes |
|---|---|
| NTAG213 | Most common, 144 bytes |
| NTAG215 | 504 bytes |
| NTAG216 | 888 bytes |
| MIFARE Ultralight | Basic, 48 bytes |

---

## How it works

### 1. Startup

The agent starts an HTTP + WebSocket server on `http://localhost:8765`. It immediately begins polling for connected PC/SC readers every 5 seconds.

### 2. Reader detection

When a reader is plugged in, the agent automatically selects it and starts monitoring for tags. If the reader is unplugged it resets and waits for the next one.

### 3. Tag scan

When a tag is tapped on the reader:

1. The agent reads the tag's UID using the `GET UID` APDU command (`FF CA 00 00 00`)
2. It broadcasts a `tag_scanned` event to all connected WebSocket clients
3. The SpoolHub browser tab receives the event and calls `/api/nfc-tags/scan` on the SpoolHub backend
4. SpoolHub looks up which spool the tag belongs to and updates the UI

### 4. Browser connection

The SpoolHub Scan page connects to the agent at `ws://localhost:8765/events` and:
- Calls `GET /health` to check the agent is running before showing the scan UI
- Calls `GET /readers` on WebSocket open to get the current reader state
- Listens for `reader_status` and `tag_scanned` events in real time

---

## API reference

The agent exposes a small HTTP + WebSocket API on `localhost:8765`.

### `GET /health`

Returns 200 when the agent is running. Used by the browser to detect agent presence.

```json
{ "status": "ok" }
```

### `GET /readers`

Returns the current reader state.

```json
{
  "connected": true,
  "activeReader": "ACS ACR122U PICC Interface 0",
  "availableReaders": ["ACS ACR122U PICC Interface 0"]
}
```

### `POST /disconnect`

Stops monitoring the active reader. The browser calls this when the user clicks the disconnect button. Returns 200.

### `WS /events`

WebSocket endpoint. The agent pushes two event types:

**`reader_status`** — sent when a reader connects or disconnects, and immediately on WebSocket open with the current state.

```json
{ "event": "reader_status", "connected": true, "reader": "ACS ACR122U PICC Interface 0" }
{ "event": "reader_status", "connected": false, "reader": null }
```

**`tag_scanned`** — sent when a tag is tapped on the reader.

```json
{ "event": "tag_scanned", "uid": "04:A3:2F:1B:7C:00:00" }
```

---

## Architecture

```
src/agent/
├── README.md
└── SpoolHubAgent/
    ├── Program.cs            ASP.NET Core minimal API — routes + server setup
    ├── NfcService.cs         PC/SC watching, tag reading, WebSocket broadcast
    └── SpoolHubAgent.csproj
```

**`Program.cs`** sets up the HTTP server on port 8765, registers CORS (open, since the browser origin varies), enables WebSockets, and wires up the four routes.

**`NfcService.cs`** is an `IHostedService` that:
- Polls `SCardContext` every 5 s for available readers
- Starts a `ISCardMonitor` on the first available reader
- On `CardInserted` event: transmits the GET UID APDU, formats the UID as `XX:XX:XX:XX`, and broadcasts `tag_scanned` to all WebSocket clients
- Maintains a `ConcurrentDictionary<Guid, WebSocket>` of connected browser tabs
- `HandleClientAsync` keeps each WebSocket alive until the browser disconnects

---

## Building from source

Requirements: .NET 10 SDK

```bash
cd src/agent/SpoolHubAgent
dotnet build
```

To publish a self-contained single-file binary for each platform:

```bash
# Windows (x64)
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ./publish/win

# macOS (Intel)
dotnet publish -c Release -r osx-x64 --self-contained true -p:PublishSingleFile=true -o ./publish/mac-x64

# macOS (Apple Silicon)
dotnet publish -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true -o ./publish/mac-arm64

# Linux (x64)
dotnet publish -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -o ./publish/linux

# Raspberry Pi (ARM64)
dotnet publish -c Release -r linux-arm64 --self-contained true -p:PublishSingleFile=true -o ./publish/linux-arm64
```

Each output folder contains a single executable with no runtime dependency.

---

## Troubleshooting

**SpoolHub shows "Agent not running" even after install**
- Make sure the agent is running (check the system tray or Task Manager for `SpoolHubAgent.exe`)
- Check that nothing else is using port 8765
- Try running the agent manually from the install directory

**Reader shows as connected but tags are not detected**
- Make sure the reader has a green LED (ready state)
- Try unplugging and replugging the reader — the agent auto-reconnects
- Check Windows Device Manager for driver issues

**"Access denied" error on startup**
- The agent needs access to the PC/SC service. Run it as a standard user (not needed to run as admin)
- Make sure the Windows Smart Card service is running: `services.msc` → `Smart Card` → Started
