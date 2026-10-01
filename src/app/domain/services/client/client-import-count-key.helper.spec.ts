// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { clientImportCountKey } from './client-import-count-key.helper';
import { CLIENT_IMPORT_COUNT_KEYS } from 'src/app/domain/constants/client-import.constants';

describe('clientImportCountKey', () => {
  const keys = CLIENT_IMPORT_COUNT_KEYS.commitBlocked;

  it('uses the singular key for exactly one', () => {
    expect(clientImportCountKey(keys, 1)).toBe('clientImport.preview.commitBlocked.one');
  });

  it.each([0, 2, 5, 21, 100])('uses the plural key for %i', (count) => {
    expect(clientImportCountKey(keys, count)).toBe('clientImport.preview.commitBlocked.other');
  });

  it('defines a distinct singular and plural key for every count text', () => {
    for (const entry of Object.values(CLIENT_IMPORT_COUNT_KEYS)) {
      expect(entry.one).toMatch(/^clientImport\..+\.one$/);
      expect(entry.other).toBe(entry.one.replace(/\.one$/, '.other'));
    }
  });
});
