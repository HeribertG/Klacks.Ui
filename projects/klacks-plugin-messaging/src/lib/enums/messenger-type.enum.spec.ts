// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for the messaging enums and their label map.
 */

import { describe, it, expect } from 'vitest';
import { MessengerType, MESSENGER_TYPE_LABELS } from './messenger-type.enum';
import { MessageStatus } from './message-status.enum';

describe('MessengerType', () => {
  it('keeps the numeric contract with the backend enum', () => {
    expect(MessengerType.Telegram).toBe(1);
    expect(MessengerType.Sms).toBe(12);
  });

  it('provides a non-empty label for every messenger type', () => {
    const values = Object.values(MessengerType).filter(
      (value): value is MessengerType => typeof value === 'number',
    );
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(MESSENGER_TYPE_LABELS[value]).toBeTruthy();
    }
  });
});

describe('MessageStatus', () => {
  it('keeps Pending as 0 and Failed as 4', () => {
    expect(MessageStatus.Pending).toBe(0);
    expect(MessageStatus.Failed).toBe(4);
  });
});
