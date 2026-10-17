// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  hasHeldQualificationLevel,
  localizeQualificationLevelParams,
  qualificationLevelLabel,
  qualificationLevelLabelKey,
} from './qualification-level-label.helper';

const translate = (key: string): string => `label:${key}`;

describe('qualification-level-label.helper', () => {
  it('maps the enum name the backend sends to the level label key', () => {
    expect(qualificationLevelLabelKey('Low')).toBe('shift.edit-shift.qualifications.level.1');
    expect(qualificationLevelLabelKey('Expert')).toBe('shift.edit-shift.qualifications.level.5');
  });

  it('accepts a numeric level as well', () => {
    expect(qualificationLevelLabelKey('3')).toBe('shift.edit-shift.qualifications.level.3');
  });

  it('returns null for an unknown or empty level', () => {
    expect(qualificationLevelLabelKey('Master')).toBeNull();
    expect(qualificationLevelLabelKey('9')).toBeNull();
    expect(qualificationLevelLabelKey('')).toBeNull();
    expect(qualificationLevelLabelKey(undefined)).toBeNull();
  });

  it('shows the raw value when the level is unknown', () => {
    expect(qualificationLevelLabel('Master', translate)).toBe('Master');
    expect(qualificationLevelLabel('Basic', translate)).toBe('label:shift.edit-shift.qualifications.level.2');
  });

  it('detects whether the held level is present', () => {
    expect(hasHeldQualificationLevel({ heldLevel: 'Basic' })).toBe(true);
    expect(hasHeldQualificationLevel({ minLevel: 'Basic' })).toBe(false);
    expect(hasHeldQualificationLevel(undefined)).toBe(false);
  });

  it('localizes min and held level and leaves the other params untouched', () => {
    expect(
      localizeQualificationLevelParams(
        { qualificationId: 'q-1', minLevel: 'Advanced', heldLevel: 'Low', levelDelta: '3' },
        translate,
      ),
    ).toEqual({
      qualificationId: 'q-1',
      minLevel: 'label:shift.edit-shift.qualifications.level.4',
      heldLevel: 'label:shift.edit-shift.qualifications.level.1',
      levelDelta: '3',
    });
  });
});
