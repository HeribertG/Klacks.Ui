// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { isSaveable } from './manageable.helper';

describe('manageable helper', () => {
  describe('isSaveable', () => {
    it('recognises a manager that reports unsaved changes and can save them', () => {
      expect(isSaveable({ areObjectsDirty: () => true, save: () => undefined })).toBe(true);
    });

    it('rejects a manager that reports unsaved changes but cannot save them', () => {
      expect(isSaveable({ areObjectsDirty: () => true })).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a string', 'manager'],
      ['an empty object', {}],
    ])('rejects %s', (_label, value) => {
      expect(isSaveable(value)).toBe(false);
    });
  });
});
