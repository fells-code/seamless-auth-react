/*
 * Copyright © 2026 Fells Code, LLC
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license information
 */

import jsQR from 'jsqr';

import { qrCode, qrMatrix } from '../src';

const OTPAUTH =
  'otpauth://totp/Seamless%20Auth:alice%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Seamless%20Auth&algorithm=SHA1&digits=6&period=30';

const SCALE = 4;
const QUIET = 4;

function decode(matrix: boolean[][]) {
  const side = (matrix.length + QUIET * 2) * SCALE;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < SCALE; dy++) {
        for (let dx = 0; dx < SCALE; dx++) {
          const offset =
            (((y + QUIET) * SCALE + dy) * side + (x + QUIET) * SCALE + dx) * 4;
          pixels.fill(0, offset, offset + 3);
        }
      }
    })
  );
  return jsQR(pixels, side, side, { inversionAttempts: 'dontInvert' });
}

// ISO/IEC 18004 Table 7, byte mode at error correction level M, versions 1 to 40.
const BYTE_CAPACITY_M = [
  14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560,
  624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722,
  1809, 1911, 1989, 2099, 2213, 2331,
];

const versionOf = (text: string) => (qrMatrix(text).length - 17) / 4;

describe('qrCode', () => {
  it('encodes an otpauth enrollment URL that decodes back to the same text', () => {
    const result = decode(qrMatrix(OTPAUTH));
    expect(result?.data).toBe(OTPAUTH);
    expect(result?.version).toBe(versionOf(OTPAUTH));
  });

  it('uses version 1 for short strings', () => {
    const matrix = qrMatrix('hello');
    expect(matrix).toHaveLength(21);
    expect(decode(matrix)?.data).toBe('hello');
  });

  it('picks the smallest version that fits at level M', () => {
    expect(versionOf('a'.repeat(14))).toBe(1);
    expect(versionOf('a'.repeat(15))).toBe(2);
    expect(versionOf('a'.repeat(26))).toBe(2);
    expect(versionOf('a'.repeat(27))).toBe(3);
    expect(versionOf('a'.repeat(213))).toBe(10);
    expect(versionOf('a'.repeat(214))).toBe(11);
  });

  it('writes version information that decodes from version 7 up', () => {
    const text = 'x'.repeat(150);
    const matrix = qrMatrix(text);
    expect(versionOf(text)).toBeGreaterThanOrEqual(7);
    const result = decode(matrix);
    expect(result?.data).toBe(text);
    expect(result?.version).toBe(versionOf(text));
  });

  it('fills every version from 1 to 40 to its byte capacity and decodes', () => {
    BYTE_CAPACITY_M.forEach((capacity, i) => {
      const text = Array.from({ length: capacity }, (_, k) =>
        String.fromCharCode(33 + (k % 90))
      ).join('');
      const matrix = qrMatrix(text);
      expect((matrix.length - 17) / 4).toBe(i + 1);
      if (i < 39) expect(versionOf(text + '!')).toBe(i + 2);
      expect(decode(matrix)?.data).toBe(text);
    });
  });

  it('encodes non-ASCII text as UTF-8', () => {
    const text = 'Zoë 日本語 🔐';
    const result = decode(qrMatrix(text));
    expect(result?.binaryData).toEqual(Array.from(new TextEncoder().encode(text)));
    expect(result?.data).toBe(text);
  });

  it('replaces a lone surrogate with U+FFFD, as TextEncoder does', () => {
    expect(decode(qrMatrix('a\ud800b'))?.binaryData).toEqual([
      0x61, 0xef, 0xbf, 0xbd, 0x62,
    ]);
  });

  it('draws dark modules as one rect per horizontal run, offset by the quiet zone', () => {
    const matrix = qrMatrix(OTPAUTH);
    const { size, path } = qrCode(OTPAUTH);
    expect(size).toBe(matrix.length + 8);
    expect(path).toMatch(/^(M\d+ \d+h\d+v1h-\d+z)+$/);
    expect(path.startsWith('M4 4h7v1h-7z')).toBe(true);

    const drawn = matrix.map(row => row.map(() => false));
    for (const [, x, y, w, back] of path.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)) {
      expect(back).toBe(w);
      for (let i = 0; i < Number(w); i++) drawn[Number(y) - 4][Number(x) - 4 + i] = true;
      expect(matrix[Number(y) - 4][Number(x) - 5] ?? false).toBe(false);
      expect(matrix[Number(y) - 4][Number(x) - 4 + Number(w)] ?? false).toBe(false);
    }
    expect(drawn).toEqual(matrix);
  });

  it('throws a RangeError when the text does not fit version 40', () => {
    expect(() => qrCode('a'.repeat(2332))).toThrow(RangeError);
    expect(() => qrMatrix('é'.repeat(1166))).toThrow(RangeError);
  });
});
