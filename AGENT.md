# SpoolHub Agent

The SpoolHub Agent is a lightweight desktop app that connects your USB NFC reader to the SpoolHub web interface. It runs in the background on your PC and forwards tag scans to the browser over a local WebSocket connection.

SpoolHub runs inside Docker, which cannot access USB devices on your machine. The agent runs natively and bridges that gap.

## Download

**Windows installer:** [SpoolHubAgent-Setup.exe](https://github.com/spoolhub/spoolhub/releases/latest/download/SpoolHubAgent-Setup.exe)

## Automatic install (recommended)

1. Open SpoolHub and go to the **Scan** page
2. SpoolHub detects the agent is missing and shows an install prompt
3. Click **Download Agent** — the installer downloads and runs automatically
4. The agent starts in the background and SpoolHub connects within seconds

## Supported platforms

| Platform | Notes |
|---|---|
| Windows 10 / 11 (x64) | No setup needed — PC/SC is built in |
| macOS 12+ (Intel + Apple Silicon) | No setup needed — PC/SC is built in |
| Linux / Raspberry Pi | `sudo apt install pcscd && sudo systemctl enable --now pcscd` |

## Supported NFC readers

ACR122U, SCL3711, OmniKey, Feitian, NXP, SpringCard, Bit4ID — any standard PC/SC USB reader.

## Supported NFC tags

NTAG213 · NTAG215 · NTAG216 · MIFARE Ultralight

---

Full documentation (API reference, building from source, troubleshooting): [src/agent/README.md](src/agent/README.md)
