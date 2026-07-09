interface HIDDeviceFilter {
  vendorId?: number
  productId?: number
  usagePage?: number
  usage?: number
}

interface HIDDeviceRequestOptions {
  filters: HIDDeviceFilter[]
}

interface HIDInputReportEvent extends Event {
  device: HIDDevice
  reportId: number
  data: DataView
}

interface HIDDevice extends EventTarget {
  readonly opened: boolean
  readonly vendorId: number
  readonly productId: number
  readonly productName: string
  readonly collections: HIDCollectionInfo[]
  open(): Promise<void>
  close(): Promise<void>
  sendReport(reportId: number, data: Uint8Array | ArrayBuffer): Promise<void>
  sendFeatureReport(reportId: number, data: Uint8Array | ArrayBuffer): Promise<void>
  receiveFeatureReport(reportId: number): Promise<DataView>
  addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void
  removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void
}

interface HIDCollectionInfo {
  usagePage?: number
  usage?: number
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>
}

interface Navigator {
  readonly hid: HID
}
