interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: BufferSource): Promise<void>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: number | string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: number | string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothDevice extends EventTarget {
  readonly name: string | undefined
  readonly gatt: BluetoothRemoteGATTServer | undefined
}

interface RequestDeviceOptions {
  filters?: Array<{ namePrefix?: string; services?: Array<number | string> }>
  optionalServices?: Array<number | string>
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
}

interface Navigator {
  bluetooth: Bluetooth
}
