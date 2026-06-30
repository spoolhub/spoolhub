<p align="center">
  <img src="assets/logo.svg" width="520" alt="SpoolHub logo" />
</p>

<p align="center">
  <em>Self-Hosted Automated Filament Inventory Management.</em>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="License" /></a>
  <a href="https://github.com/spoolhub/spoolhub/releases/latest"><img src="https://img.shields.io/github/v/release/spoolhub/spoolhub" alt="GitHub Release" /></a>
  <a href="https://ghcr.io/spoolhub/spoolhub"><img src="https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker" alt="Docker" /></a>
  <a href="AGENT.md"><img src="https://img.shields.io/badge/agent-docs-brightgreen?logo=windows" alt="SpoolHub Agent" /></a>
</p>

---

SpoolHub helps you track filament stock, monitor printer usage, and manage your spools all from a single locally hosted dashboard. Connect your printers and let SpoolHub keep count automatically.

### Features

* **Spool Registry** — Track brand, material, color, and remaining weight for every spool.
* **Automatic Usage Tracking** — Connects to Bambu Lab printers via MQTT and deducts filament weight after each print. Moonraker (Klipper) and PrusaLink support planned.
* **NFC Tag Support** — Tap a spool's NFC tag to instantly identify and activate it.
* **Real-Time Updates** — Live spool status pushed to the browser via SignalR.
* **REST API** — Full spool and printer management endpoints for integration with external tools.
* **Multi-Printer Management** — Handle spool updates from several printers simultaneously.

**SpoolHub integrates with:**
* Bambu Lab printers via MQTT
* Moonraker / Klipper (planned)
* PrusaLink (planned)

---

## Installation

### SpoolHub

Create a `docker-compose.yml`:

```yaml
services:
  spoolhub:
    image: ghcr.io/spoolhub/spoolhub:latest
    container_name: spoolhub
    restart: unless-stopped
    ports:
      - "4848:4848"
    volumes:
      - ./data:/data
```

Then run:

```bash
docker compose up -d
```

Open `http://localhost:4848` in your browser.

---

### SpoolHub Agent

The SpoolHub Agent is a lightweight PC application that connects your USB NFC reader to the SpoolHub web interface. It runs in the background on your machine and bridges the gap between the physical reader and the browser.

> SpoolHub runs inside Docker, which cannot access USB devices on your PC. The agent runs natively and forwards tag scans to the browser over a local WebSocket connection.

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

**Automatic install (recommended):**
1. Open SpoolHub and go to the **Scan** page
2. SpoolHub detects the agent is missing and shows an install prompt
3. Click **Download Agent** — the installer downloads and runs automatically
4. The agent starts in the background and SpoolHub connects within seconds

**Manual install:**
Download [`SpoolHubAgent-Setup.exe`](https://github.com/spoolhub/spoolhub/releases/latest/download/SpoolHubAgent-Setup.exe) from the latest release and run it.

**Supported platforms:**

| Platform | Notes |
|---|---|
| Windows 10 / 11 (x64) | No setup needed — PC/SC is built in |
| macOS 12+ (Intel + Apple Silicon) | No setup needed — PC/SC is built in |
| Linux / Raspberry Pi | `sudo apt install pcscd && sudo systemctl enable --now pcscd` |

**Supported NFC readers:** ACR122U, SCL3711, OmniKey, Feitian, NXP, SpringCard, Bit4ID — any standard PC/SC USB reader.

**Supported NFC tags:** NTAG213 · NTAG215 · NTAG216 · MIFARE Ultralight

> Full agent documentation: [src/agent/README.md](src/agent/README.md)

---

## Supporters

SpoolHub is built and maintained for free. Without community support, this project cannot grow.
[**Become a backer or sponsor**](https://opencollective.com/spoolhub) and help keep it alive!

## Contributing

By submitting a pull request, you agree to the [Contributor License Agreement](CLA.md).
