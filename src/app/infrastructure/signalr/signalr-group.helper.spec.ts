// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as signalR from '@microsoft/signalr';
import { SignalRGroupHelper } from './signalr-group.helper';
import { SignalRConstants } from './signalr.constants';

interface FakeHub {
  invoke: ReturnType<typeof vi.fn>;
}

function createFakeHub(): FakeHub {
  return {
    invoke: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SignalRGroupHelper', () => {
  let hub: FakeHub | null;
  let connected: boolean;
  let helper: SignalRGroupHelper;

  beforeEach(() => {
    hub = createFakeHub();
    connected = true;
    helper = new SignalRGroupHelper(
      () => (hub as unknown as signalR.HubConnection | null),
      () => connected,
    );
  });

  describe('joinScheduleGroup', () => {
    it('invokes JoinScheduleGroup directly when connected', async () => {
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', 'token-1');
      expect(hub!.invoke).toHaveBeenCalledWith(
        SignalRConstants.HubMethods.JoinScheduleGroup,
        '2026-01-01',
        '2026-01-31',
        'token-1',
      );
      expect(helper.currentGroup).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        analyseToken: 'token-1',
      });
    });

    it('caches the group and skips invoke while disconnected', async () => {
      connected = false;
      await helper.joinScheduleGroup('2026-02-01', '2026-02-28', null);
      expect(hub!.invoke).not.toHaveBeenCalled();
      expect(helper.currentGroup).toEqual({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        analyseToken: null,
      });
    });

    it('coalesces multiple offline joins so flush only sends the latest', async () => {
      connected = false;
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', null);
      await helper.joinScheduleGroup('2026-02-01', '2026-02-28', 'token-2');

      connected = true;
      await helper.flush();

      const joinCalls = hub!.invoke.mock.calls.filter(
        (c) => c[0] === SignalRConstants.HubMethods.JoinScheduleGroup,
      );
      expect(joinCalls).toHaveLength(1);
      expect(joinCalls[0]).toEqual([
        SignalRConstants.HubMethods.JoinScheduleGroup,
        '2026-02-01',
        '2026-02-28',
        'token-2',
      ]);
    });

    it('leaves the previous group before joining a new one when connected', async () => {
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', null);
      await helper.joinScheduleGroup('2026-02-01', '2026-02-28', null);

      const calls = hub!.invoke.mock.calls.map((c) => c[0]);
      expect(calls).toContain(SignalRConstants.HubMethods.LeaveScheduleGroup);
      expect(calls.filter((c) => c === SignalRConstants.HubMethods.JoinScheduleGroup)).toHaveLength(2);
    });
  });

  describe('setSelectedGroup', () => {
    it('invokes immediately when connected', async () => {
      await helper.setSelectedGroup('group-42');
      expect(hub!.invoke).toHaveBeenCalledWith(
        SignalRConstants.HubMethods.SetSelectedGroup,
        'group-42',
      );
    });

    it('queues the latest selection while disconnected and flushes on reconnect', async () => {
      connected = false;
      await helper.setSelectedGroup('group-1');
      await helper.setSelectedGroup('group-2');
      expect(hub!.invoke).not.toHaveBeenCalled();

      connected = true;
      await helper.flush();

      const selectCalls = hub!.invoke.mock.calls.filter(
        (c) => c[0] === SignalRConstants.HubMethods.SetSelectedGroup,
      );
      expect(selectCalls).toHaveLength(1);
      expect(selectCalls[0]).toEqual([
        SignalRConstants.HubMethods.SetSelectedGroup,
        'group-2',
      ]);
    });
  });

  describe('flush', () => {
    it('does nothing when not connected', async () => {
      connected = false;
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', null);

      hub!.invoke.mockClear();
      await helper.flush();

      expect(hub!.invoke).not.toHaveBeenCalled();
    });

    it('replays the cached group even without explicit queued ops', async () => {
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', 'tok');
      hub!.invoke.mockClear();

      await helper.flush();

      expect(hub!.invoke).toHaveBeenCalledWith(
        SignalRConstants.HubMethods.JoinScheduleGroup,
        '2026-01-01',
        '2026-01-31',
        'tok',
      );
    });

    it('replays both join and select after disconnected window', async () => {
      connected = false;
      await helper.joinScheduleGroup('2026-03-01', '2026-03-31', null);
      await helper.setSelectedGroup('grp-x');

      connected = true;
      await helper.flush();

      const calls = hub!.invoke.mock.calls.map((c) => c[0]);
      expect(calls).toContain(SignalRConstants.HubMethods.JoinScheduleGroup);
      expect(calls).toContain(SignalRConstants.HubMethods.SetSelectedGroup);
    });
  });

  describe('leaveScheduleGroup', () => {
    it('drops cached group when leave matches while disconnected', async () => {
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', null);
      connected = false;
      await helper.leaveScheduleGroup('2026-01-01', '2026-01-31', null);
      expect(helper.currentGroup).toBeNull();
    });

    it('does not drop cached group when dates differ', async () => {
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', null);
      connected = false;
      await helper.leaveScheduleGroup('2026-04-01', '2026-04-30', null);
      expect(helper.currentGroup).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        analyseToken: null,
      });
    });
  });

  describe('hub resolution', () => {
    it('skips invoke when resolveHub returns null even if connected flag is true', async () => {
      hub = null;
      await helper.joinScheduleGroup('2026-01-01', '2026-01-31', null);
      expect(helper.currentGroup).toEqual({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        analyseToken: null,
      });
    });
  });
});
