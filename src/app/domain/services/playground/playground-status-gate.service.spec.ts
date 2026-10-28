// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { PlaygroundStatusGateService } from './playground-status-gate.service';

describe('PlaygroundStatusGateService', () => {
  let gate: PlaygroundStatusGateService;

  beforeEach(() => {
    gate = TestBed.inject(PlaygroundStatusGateService);
  });

  it('is resolved and never makes anyone wait as long as no status load began', async () => {
    expect(gate.statusResolved()).toBe(true);
    await expect(gate.waitUntilResolved()).resolves.toBe(true);
    await expect(gate.whenResolved()).resolves.toBeUndefined();
  });

  it('holds waiters back until the load ends', async () => {
    // Arrange
    gate.begin();
    let released = false;
    const waiter = gate.waitUntilResolved().then((result) => {
      released = true;
      return result;
    });
    await Promise.resolve();

    // Assert
    expect(gate.statusResolved()).toBe(false);
    expect(released).toBe(false);

    // Act
    gate.end();

    // Assert
    await expect(waiter).resolves.toBe(true);
    expect(gate.statusResolved()).toBe(true);
  });

  it('lets only one caller wait at a time so a double click cannot send twice', async () => {
    // Arrange
    gate.begin();
    const first = gate.waitUntilResolved();

    // Act
    const second = await gate.waitUntilResolved();
    gate.end();

    // Assert
    expect(second).toBe(false);
    await expect(first).resolves.toBe(true);
    await expect(gate.waitUntilResolved()).resolves.toBe(true);
  });

  it('releases every whenResolved caller, such as parallel HTTP requests', async () => {
    // Arrange
    gate.begin();
    const requests = [gate.whenResolved(), gate.whenResolved()];

    // Act
    gate.end();

    // Assert
    await expect(Promise.all(requests)).resolves.toEqual([undefined, undefined]);
  });

  describe('unknown status', () => {
    it('is not unknown and rechecks nothing by default', () => {
      const recheck = vi.fn().mockResolvedValue(undefined);
      gate.registerRecheck(recheck);

      gate.recheckIfUnknown();

      expect(gate.statusUnknown()).toBe(false);
      expect(recheck).not.toHaveBeenCalled();
    });

    it('rechecks an unknown status exactly once', () => {
      // Arrange
      const recheck = vi.fn().mockResolvedValue(undefined);
      gate.registerRecheck(recheck);
      gate.markUnknown(true);

      // Act
      gate.recheckIfUnknown();
      gate.recheckIfUnknown();

      // Assert
      expect(gate.statusUnknown()).toBe(true);
      expect(recheck).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no recheck is registered', () => {
      gate.markUnknown(true);

      expect(() => gate.recheckIfUnknown()).not.toThrow();
    });
  });
});
