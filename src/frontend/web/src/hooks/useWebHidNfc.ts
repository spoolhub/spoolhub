import { useState, useRef, useCallback, useEffect } from 'react'

const NFC_READER_FILTERS: HIDDeviceFilter[] = [
  { vendorId: 0x072F },  // ACS (ACR122U, ACR1252U, etc.)
  { vendorId: 0x04E6 },  // SCM / Identiv (SCL3711)
  { vendorId: 0x076B },  // OmniKey
  { vendorId: 0x1FC9 },  // NXP
  { vendorId: 0x04CC },  // Philips / NXP
]

export type WebHidNfcState = 'idle' | 'searching' | 'connected' | 'error'

function buildGetUidReport(seq: number): Uint8Array {
  // CCID PC_to_RDR_XfrBlock wrapping GetUID APDU (FF CA 00 00 00)
  const buf = new Uint8Array(64)
  buf[0] = 0x6F          // PC_to_RDR_XfrBlock
  buf[1] = 0x05          // dwLength (LE) – 5 bytes of APDU
  buf[5] = 0x00          // bSlot
  buf[6] = seq & 0xFF    // bSeq
  buf[7] = 0x00          // bBWI
  buf[10] = 0xFF         // GetUID APDU
  buf[11] = 0xCA
  buf[12] = 0x00
  buf[13] = 0x00
  buf[14] = 0x00
  return buf
}

function parseUid(buf: Uint8Array): string | null {
  // RDR_to_PC_DataBlock: [0x80, len_lo, len_b1, len_b2, len_hi, slot, seq, status, error, chain, ...data]
  if (buf[0] !== 0x80) return null
  const len = buf[1] | (buf[2] << 8)
  if (len < 2 || buf[7] !== 0x00) return null      // status must be 0 (success)
  const sw1 = buf[10 + len - 2]
  const sw2 = buf[10 + len - 1]
  if (sw1 !== 0x90 || sw2 !== 0x00) return null    // SW 9000 = success
  const uidBytes = buf.slice(10, 10 + len - 2)
  return Array.from(uidBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':')
}

function exchangeApdu(device: HIDDevice, report: Uint8Array): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      device.removeEventListener('inputreport', handler)
      reject(new Error('timeout'))
    }, 1500)

    function handler(ev: HIDInputReportEvent) {
      clearTimeout(timer)
      device.removeEventListener('inputreport', handler)
      resolve(new Uint8Array(ev.data.buffer))
    }

    device.addEventListener('inputreport', handler)
    device.sendReport(0, report).catch(err => {
      clearTimeout(timer)
      device.removeEventListener('inputreport', handler)
      reject(err)
    })
  })
}

export function useWebHidNfc(onTagFound: (uid: string) => void) {
  const [state, setState] = useState<WebHidNfcState>('idle')
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const deviceRef = useRef<HIDDevice | null>(null)
  const cancelRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seqRef = useRef(0)
  const lastUidRef = useRef<string | null>(null)
  const onTagFoundRef = useRef(onTagFound)

  useEffect(() => { onTagFoundRef.current = onTagFound }, [onTagFound])
  useEffect(() => () => stopPolling(), [])

  function stopPolling() {
    cancelRef.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function scheduleNextPoll(device: HIDDevice) {
    timerRef.current = setTimeout(async () => {
      if (cancelRef.current || deviceRef.current !== device) return
      try {
        const resp = await exchangeApdu(device, buildGetUidReport(seqRef.current++ & 0xFF))
        const uid = parseUid(resp)
        if (uid && uid !== lastUidRef.current) {
          lastUidRef.current = uid
          onTagFoundRef.current(uid)
        } else if (!uid) {
          lastUidRef.current = null
        }
      } catch { /* timeout or send error – keep polling */ }
      if (!cancelRef.current && deviceRef.current === device) {
        scheduleNextPoll(device)
      }
    }, 500)
  }

  const connect = useCallback(async () => {
    if (!('hid' in navigator)) {
      setErrorMsg('WebHID is not supported. Use Chrome or Edge on desktop.')
      setState('error')
      return
    }
    try {
      const devices = await navigator.hid.requestDevice({ filters: NFC_READER_FILTERS })
      if (devices.length === 0) return
      const device = devices[0]
      await device.open()
      deviceRef.current = device
      cancelRef.current = false
      seqRef.current = 0
      lastUidRef.current = null
      setDeviceName(device.productName || 'NFC Reader')
      setState('connected')
      setErrorMsg(null)
      scheduleNextPoll(device)
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') return
      setErrorMsg(e instanceof Error ? e.message : 'Connection failed')
      setState('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reload = useCallback(async () => {
    if (!('hid' in navigator)) {
      setErrorMsg('WebHID is not supported. Use Chrome or Edge on desktop.')
      setState('error')
      return
    }
    setState('searching')
    setErrorMsg(null)
    try {
      // 1. Check already-permitted devices silently (no popup)
      const permitted = await navigator.hid.getDevices()
      const compatible = permitted.filter(d =>
        NFC_READER_FILTERS.some(f => f.vendorId === d.vendorId)
      )

      let device: HIDDevice
      if (compatible.length > 0) {
        // Found a previously permitted reader — animate briefly then connect
        await new Promise<void>(r => setTimeout(r, 1000))
        device = compatible[0]
      } else {
        // No permitted reader found — open picker filtered to supported readers only
        const picked = await navigator.hid.requestDevice({ filters: NFC_READER_FILTERS })
        if (picked.length === 0) { setState('idle'); return }
        device = picked[0]
      }

      if (!device.opened) await device.open()
      deviceRef.current = device
      cancelRef.current = false
      seqRef.current = 0
      lastUidRef.current = null
      setDeviceName(device.productName || 'NFC Reader')
      setState('connected')
      scheduleNextPoll(device)
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') { setState('idle'); return }
      setErrorMsg(e instanceof Error ? e.message : 'Connection failed')
      setState('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disconnect = useCallback(async () => {
    stopPolling()
    const d = deviceRef.current
    deviceRef.current = null
    setDeviceName(null)
    setState('idle')
    setErrorMsg(null)
    if (d) { try { await d.close() } catch { /* ignore */ } }
  }, [])

  return { state, deviceName, errorMsg, connect, reload, disconnect }
}
