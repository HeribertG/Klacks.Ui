// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { jsPDF } from 'jspdf';
import {
  THAI_MARK_SUBSTITUTE_ORIGINALS,
  containsThai,
  positionThaiMarks,
} from './thai-mark-positioning.model';

const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_DIR = resolve(HERE, '../../../../assets/fonts');
const THAI_FONT_FILES = ['NotoSansThai-Regular.ttf', 'NotoSansThai-Bold.ttf'];

const MAI_EK = 0x0e48;
const MAI_THO = 0x0e49;
const SARA_UEE = 0x0e37;
const SARA_I = 0x0e34;

function codes(text: string): number[] {
  return [...text].map(char => char.codePointAt(0) ?? 0);
}

describe('thai-mark-positioning.model', () => {
  it('lifts a tone mark that follows an upper vowel', () => {
    const result = codes(positionThaiMarks('เมื่อ'));

    expect(result[2]).toBe(SARA_UEE);
    expect(result[3]).not.toBe(MAI_EK);
    expect(THAI_MARK_SUBSTITUTE_ORIGINALS.get(result[3])).toBe(MAI_EK);
  });

  it('moves marks above a tall consonant to the left', () => {
    const result = codes(positionThaiMarks('ปี่'));

    expect(THAI_MARK_SUBSTITUTE_ORIGINALS.get(result[1])).toBe(0x0e35);
    expect(THAI_MARK_SUBSTITUTE_ORIGINALS.get(result[2])).toBe(MAI_EK);
  });

  it('keeps tone marks on ordinary consonants and text without Thai unchanged', () => {
    expect(positionThaiMarks('สร้าง')).toBe('สร้าง');
    expect(codes(positionThaiMarks('ให้'))[2]).toBe(MAI_THO);
    expect(positionThaiMarks('Zürich 12')).toBe('Zürich 12');
    expect(codes(positionThaiMarks('เริ่ม'))[2]).toBe(SARA_I);
  });

  it('detects Thai text', () => {
    expect(containsThai('สรุปเส้นทาง')).toBe(true);
    expect(containsThai('Route')).toBe(false);
  });

  it.each(THAI_FONT_FILES)('finds a glyph for every substitute in %s', fileName => {
    const doc = new jsPDF();
    doc.addFileToVFS(fileName, readFileSync(resolve(FONT_DIR, fileName)).toString('base64'));
    doc.addFont(fileName, 'ThaiProbe', 'normal');
    doc.setFont('ThaiProbe', 'normal');
    const codeMap = (doc.getFont().metadata as unknown as { cmap: { unicode: { codeMap: Record<number, number> } } })
      .cmap.unicode.codeMap;

    const missing = [...THAI_MARK_SUBSTITUTE_ORIGINALS.keys()].filter(code => !codeMap[code]);
    expect(missing).toEqual([]);
  });
});
