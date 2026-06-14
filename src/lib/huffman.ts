export function huffmanEncode(input: Buffer): Buffer {
  if (input.length === 0) return Buffer.alloc(0);

  const freqs = new Uint32Array(256);
  for (let i = 0; i < input.length; i++) {
    freqs[input[i]]++;
  }

  class Node {
    constructor(
      public weight: number,
      public symbol: number | null,
      public left: Node | null,
      public right: Node | null
    ) {}
  }

  const pq: Node[] = [];
  for (let i = 0; i < 256; i++) {
    if (freqs[i] > 0) {
      pq.push(new Node(freqs[i], i, null, null));
    }
  }

  while (pq.length > 1) {
    pq.sort((a, b) => b.weight - a.weight);
    const left = pq.pop()!;
    const right = pq.pop()!;
    pq.push(new Node(left.weight + right.weight, null, left, right));
  }

  const root = pq[0];
  const codes: Uint8Array[] = new Array(256);

  function buildCodes(node: Node, path: number[]) {
    if (node.symbol !== null) {
      codes[node.symbol] = new Uint8Array(path);
      return;
    }
    buildCodes(node.left!, [...path, 0]);
    buildCodes(node.right!, [...path, 1]);
  }

  if (root.symbol !== null) {
    codes[root.symbol] = new Uint8Array([0]);
  } else {
    buildCodes(root, []);
  }

  let totalBits = 0;
  for (let i = 0; i < 256; i++) {
    if (freqs[i] > 0) {
      totalBits += freqs[i] * codes[i].length;
    }
  }

  // Header: 1024 bytes (freqs), 4 bytes (original length)
  let outSize = 1024 + 4 + Math.ceil(totalBits / 8);
  const output = Buffer.alloc(outSize);

  let offset = 0;
  for (let i = 0; i < 256; i++) {
    output.writeUInt32LE(freqs[i], offset);
    offset += 4;
  }
  output.writeUInt32LE(input.length, offset);
  offset += 4;

  let currentByte = 0;
  let bitsInByte = 0;

  for (let i = 0; i < input.length; i++) {
    const bits = codes[input[i]];
    for (let j = 0; j < bits.length; j++) {
      currentByte = (currentByte << 1) | bits[j];
      bitsInByte++;
      if (bitsInByte === 8) {
        output[offset++] = currentByte;
        currentByte = 0;
        bitsInByte = 0;
      }
    }
  }

  if (bitsInByte > 0) {
    currentByte <<= (8 - bitsInByte);
    output[offset++] = currentByte;
  }

  return output;
}

export function huffmanDecode(input: Buffer): Buffer {
  if (input.length === 0) return Buffer.alloc(0);

  let offset = 0;
  const freqs = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    freqs[i] = input.readUInt32LE(offset);
    offset += 4;
  }

  const originalLength = input.readUInt32LE(offset);
  offset += 4;

  if (originalLength === 0) return Buffer.alloc(0);

  class Node {
    constructor(
      public weight: number,
      public symbol: number | null,
      public left: Node | null,
      public right: Node | null
    ) {}
  }

  const pq: Node[] = [];
  for (let i = 0; i < 256; i++) {
    if (freqs[i] > 0) {
      pq.push(new Node(freqs[i], i, null, null));
    }
  }

  if (pq.length === 0) return Buffer.alloc(0);

  while (pq.length > 1) {
    pq.sort((a, b) => b.weight - a.weight);
    const left = pq.pop()!;
    const right = pq.pop()!;
    pq.push(new Node(left.weight + right.weight, null, left, right));
  }

  const root = pq[0];
  const output = Buffer.alloc(originalLength);
  let outOffset = 0;

  let currentNode = root;
  
  if (root.symbol !== null) {
    // Only one symbol type exists
    for (let i = 0; i < originalLength; i++) {
      output[outOffset++] = root.symbol;
    }
    return output;
  }

  for (; offset < input.length; offset++) {
    const byte = input[offset];
    for (let i = 7; i >= 0; i--) {
      const bit = (byte >> i) & 1;
      if (bit === 0) currentNode = currentNode.left!;
      else currentNode = currentNode.right!;

      if (currentNode.symbol !== null) {
        output[outOffset++] = currentNode.symbol;
        if (outOffset === originalLength) {
          return output;
        }
        currentNode = root;
      }
    }
  }

  return output;
}
