// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { splitCompletedSentences } from './completed-sentences.helper';

describe('splitCompletedSentences', () => {
  it('returns complete sentences and keeps the unfinished rest', () => {
    expect(splitCompletedSentences('Hallo. Wie geht es? Gut')).toEqual({ sentences: ['Hallo.', 'Wie geht es?'], rest: 'Gut' });
  });

  it('keeps the whole buffer when no sentence is complete', () => {
    expect(splitCompletedSentences('Noch kein Ende')).toEqual({ sentences: [], rest: 'Noch kein Ende' });
  });

  it('recognises CJK and Arabic sentence marks', () => {
    expect(splitCompletedSentences('你好。مرحبا؟').sentences).toEqual(['你好。', 'مرحبا؟']);
  });

  it('gives the same result on repeated calls (no shared regex state)', () => {
    splitCompletedSentences('Eins. Zwei');
    expect(splitCompletedSentences('Drei.').sentences).toEqual(['Drei.']);
  });
});
