// ESC/POS commands for 58mm thermal printer via Web Bluetooth
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const INIT = new Uint8Array([ESC, 0x40]);
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
const ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0x00]);
const ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 0x02]);
const BOLD_ON = new Uint8Array([ESC, 0x45, 0x01]);
const BOLD_OFF = new Uint8Array([ESC, 0x45, 0x00]);
const DOUBLE_HEIGHT = new Uint8Array([GS, 0x21, 0x01]);
const NORMAL_SIZE = new Uint8Array([GS, 0x21, 0x00]);
const CUT = new Uint8Array([GS, 0x56, 0x00]);
const FEED = new Uint8Array([ESC, 0x64, 0x04]);

const encoder = new TextEncoder();

function text(str: string): Uint8Array {
  return encoder.encode(str);
}

function line(): Uint8Array {
  return new Uint8Array([LF]);
}

function dashes(len = 32): Uint8Array {
  return text('-'.repeat(len));
}

function padRow(left: string, right: string, width = 32): string {
  const space = width - left.length - right.length;
  return left + ' '.repeat(Math.max(1, space)) + right;
}

export interface ReceiptData {
  storeName: string;
  orderNumber: string;
  date: string;
  cashier: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
}

function buildReceipt(data: ReceiptData): Uint8Array[] {
  const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID').format(n);

  const parts: Uint8Array[] = [
    INIT,
    ALIGN_CENTER,
    DOUBLE_HEIGHT,
    BOLD_ON,
    text(data.storeName),
    line(),
    NORMAL_SIZE,
    BOLD_OFF,
    text('Jl. Kopi Nikmat No. 1'),
    line(),
    line(),
    ALIGN_LEFT,
    dashes(),
    line(),
    text(`No: ${data.orderNumber}`),
    line(),
    text(`Tgl: ${data.date}`),
    line(),
    text(`Kasir: ${data.cashier}`),
    line(),
    dashes(),
    line(),
  ];

  for (const item of data.items) {
    parts.push(text(item.name), line());
    const detail = padRow(
      `  ${item.qty}x ${fmt(item.price)}`,
      fmt(item.qty * item.price)
    );
    parts.push(text(detail), line());
  }

  parts.push(dashes(), line());
  parts.push(text(padRow('Subtotal', fmt(data.subtotal))), line());

  if (data.discount > 0) {
    parts.push(text(padRow('Diskon', `-${fmt(data.discount)}`)), line());
  }
  if (data.tax > 0) {
    parts.push(text(padRow('Pajak', fmt(data.tax))), line());
  }

  parts.push(dashes(), line());
  parts.push(BOLD_ON);
  parts.push(text(padRow('TOTAL', fmt(data.total))), line());
  parts.push(BOLD_OFF);
  parts.push(dashes(), line());

  parts.push(text(padRow('Bayar', `${data.paymentMethod.toUpperCase()}`)), line());
  if (data.cashReceived) {
    parts.push(text(padRow('Tunai', fmt(data.cashReceived))), line());
  }
  if (data.change && data.change > 0) {
    parts.push(text(padRow('Kembalian', fmt(data.change))), line());
  }

  parts.push(line(), ALIGN_CENTER);
  parts.push(text('Terima kasih!'), line());
  parts.push(text('Omah Coffee'), line());
  parts.push(FEED, CUT);

  return parts;
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

export async function printReceipt(data: ReceiptData): Promise<void> {
  if (!navigator.bluetooth) {
    throw new Error('Bluetooth tidak didukung di browser ini. Gunakan Chrome.');
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
  });

  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
  const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

  const receipt = concat(buildReceipt(data));

  // Send in chunks of 20 bytes (BLE MTU limit)
  const chunkSize = 20;
  for (let i = 0; i < receipt.length; i += chunkSize) {
    const chunk = receipt.slice(i, i + chunkSize);
    await characteristic.writeValue(chunk);
  }

  server.disconnect();
}
