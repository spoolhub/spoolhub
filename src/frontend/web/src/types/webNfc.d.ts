interface NDEFRecord {
  recordType: string
  mediaType?: string
  id?: string
  data?: DataView
  encoding?: string
  lang?: string
}

interface NDEFMessage {
  records: NDEFRecord[]
}

interface NDEFReadingEvent extends Event {
  message: NDEFMessage
  serialNumber: string
}

interface NDEFRecordInit {
  recordType: string
  mediaType?: string
  id?: string
  data?: string | ArrayBuffer
  encoding?: string
  lang?: string
}

interface NDEFMessageInit {
  records: NDEFRecordInit[]
}

interface NDEFWriteOptions {
  overwrite?: boolean
  signal?: AbortSignal
}

interface NDEFReader extends EventTarget {
  scan(options?: { signal?: AbortSignal }): Promise<void>
  write(message: string | NDEFMessageInit, options?: NDEFWriteOptions): Promise<void>
  addEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void
  addEventListener(type: 'error', listener: (event: Event) => void): void
  removeEventListener(type: 'reading', listener: (event: NDEFReadingEvent) => void): void
  removeEventListener(type: 'error', listener: (event: Event) => void): void
}

declare const NDEFReader: {
  prototype: NDEFReader
  new(): NDEFReader
}
