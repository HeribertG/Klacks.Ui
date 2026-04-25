// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Group membership helper for SignalR: join, leave and rejoin schedule groups.
 * Queues operations while the connection is not Connected, then drains the queue
 * once the facade signals a successful (re)connect via `flush()`.
 *
 * @param resolveHub - Function that returns the current hub or null
 * @param isConnected - Function that returns true when the hub is in Connected state
 */
import * as signalR from '@microsoft/signalr';
import { SignalRConstants } from './signalr.constants';

interface ScheduleGroup {
  startDate: string;
  endDate: string;
  analyseToken: string | null;
}

type QueuedOp =
  | { kind: 'join'; group: ScheduleGroup }
  | { kind: 'leave'; group: ScheduleGroup }
  | { kind: 'select'; selectedGroupId: string };

export class SignalRGroupHelper {
  private _currentGroup: ScheduleGroup | null = null;
  private _selectedGroupId: string | null = null;
  private _pendingGroupSwitch: Promise<void> | null = null;
  private readonly _queue: QueuedOp[] = [];

  constructor(
    private readonly resolveHub: () => signalR.HubConnection | null,
    private readonly isConnected: () => boolean,
  ) {}

  get currentGroup(): ScheduleGroup | null {
    return this._currentGroup;
  }

  async joinScheduleGroup(
    startDate: string,
    endDate: string,
    analyseToken: string | null,
  ): Promise<void> {
    const group: ScheduleGroup = { startDate, endDate, analyseToken };

    if (!this.canInvoke()) {
      this.cacheCurrentGroup(group);
      this.enqueueOnce({ kind: 'join', group });
      return;
    }

    if (this._pendingGroupSwitch) {
      await this._pendingGroupSwitch;
    }
    this._pendingGroupSwitch = this.performGroupSwitch(group);
    try {
      await this._pendingGroupSwitch;
    } finally {
      this._pendingGroupSwitch = null;
    }
  }

  async leaveScheduleGroup(
    startDate: string,
    endDate: string,
    analyseToken: string | null,
  ): Promise<void> {
    const group: ScheduleGroup = { startDate, endDate, analyseToken };

    if (!this.canInvoke()) {
      this.dropCachedGroupIfMatches(group);
      return;
    }

    const hub = this.resolveHub();
    if (!hub) return;

    try {
      await hub.invoke(
        SignalRConstants.HubMethods.LeaveScheduleGroup,
        startDate,
        endDate,
        analyseToken ?? '',
      );
    } catch {
      // ignored: leaving a non-joined group is a no-op for the backend
    }
    this.dropCachedGroupIfMatches(group);
  }

  async setSelectedGroup(selectedGroupId: string): Promise<void> {
    this._selectedGroupId = selectedGroupId;

    if (!this.canInvoke()) {
      this.enqueueSelect(selectedGroupId);
      return;
    }

    const hub = this.resolveHub();
    if (!hub) return;
    try {
      await hub.invoke(SignalRConstants.HubMethods.SetSelectedGroup, selectedGroupId);
    } catch {
      // ignored: backend missed the selection update; will be re-sent on reconnect via flush()
      this.enqueueSelect(selectedGroupId);
    }
  }

  async rejoinCurrentGroup(): Promise<void> {
    if (!this._currentGroup || !this.canInvoke()) return;
    const { startDate, endDate, analyseToken } = this._currentGroup;
    this._currentGroup = null;
    await this.joinScheduleGroup(startDate, endDate, analyseToken);
  }

  /**
   * Reconciles wire-side subscriptions with the caller's intent.
   *
   * `_currentGroup` and `_selectedGroupId` always reflect the latest desired
   * state (set both online and offline). The queue tracks ops that still need
   * to hit the wire. Both can target the same backend method, so flush picks
   * one source: a non-empty queue means "offline ops pending, drain them";
   * an empty queue with cached state means "transparent reconnect, re-assert
   * subscriptions". The two paths are mutually exclusive, which is why the
   * cached state is not also replayed during a queue drain.
   */
  async flush(): Promise<void> {
    if (!this.canInvoke()) return;

    if (this._queue.length > 0) {
      await this.drainQueue();
      return;
    }

    await this.replayCachedState();
  }

  private async drainQueue(): Promise<void> {
    while (this._queue.length > 0 && this.canInvoke()) {
      const op = this._queue.shift();
      if (!op) break;
      try {
        if (op.kind === 'join') {
          await this.performGroupSwitch(op.group);
        } else if (op.kind === 'leave') {
          const hub = this.resolveHub();
          if (hub) {
            await hub.invoke(
              SignalRConstants.HubMethods.LeaveScheduleGroup,
              op.group.startDate,
              op.group.endDate,
              op.group.analyseToken ?? '',
            );
          }
          this.dropCachedGroupIfMatches(op.group);
        } else if (op.kind === 'select') {
          const hub = this.resolveHub();
          if (hub) {
            await hub.invoke(SignalRConstants.HubMethods.SetSelectedGroup, op.selectedGroupId);
          }
        }
      } catch {
        // ignored: operation failed on the wire, watchdog reconnect will trigger another flush
      }
    }
  }

  private async replayCachedState(): Promise<void> {
    if (this._currentGroup) {
      const cached = this._currentGroup;
      this._currentGroup = null;
      await this.performGroupSwitch(cached);
    }

    if (this._selectedGroupId) {
      const hub = this.resolveHub();
      if (hub) {
        try {
          await hub.invoke(SignalRConstants.HubMethods.SetSelectedGroup, this._selectedGroupId);
        } catch {
          // ignored: next reconnect cycle will retry
        }
      }
    }
  }

  private async performGroupSwitch(group: ScheduleGroup): Promise<void> {
    const hub = this.resolveHub();
    if (!hub || !this.isConnected()) {
      this.cacheCurrentGroup(group);
      return;
    }

    if (this._currentGroup) {
      const previous = this._currentGroup;
      try {
        await hub.invoke(
          SignalRConstants.HubMethods.LeaveScheduleGroup,
          previous.startDate,
          previous.endDate,
          previous.analyseToken ?? '',
        );
      } catch {
        // ignored
      }
    }

    try {
      await hub.invoke(
        SignalRConstants.HubMethods.JoinScheduleGroup,
        group.startDate,
        group.endDate,
        group.analyseToken ?? '',
      );
    } catch {
      // ignored: leave the group cached so the next flush re-tries
    }
    this._currentGroup = group;
  }

  private canInvoke(): boolean {
    return this.isConnected() && this.resolveHub() !== null;
  }

  private cacheCurrentGroup(group: ScheduleGroup): void {
    this._currentGroup = group;
  }

  private dropCachedGroupIfMatches(group: ScheduleGroup): void {
    if (
      this._currentGroup?.startDate === group.startDate &&
      this._currentGroup?.endDate === group.endDate &&
      this._currentGroup?.analyseToken === group.analyseToken
    ) {
      this._currentGroup = null;
    }
  }

  private enqueueOnce(op: QueuedOp): void {
    if (op.kind === 'join') {
      const idx = this._queue.findIndex((q) => q.kind === 'join');
      if (idx >= 0) {
        this._queue[idx] = op;
        return;
      }
    }
    this._queue.push(op);
  }

  private enqueueSelect(selectedGroupId: string): void {
    const idx = this._queue.findIndex((q) => q.kind === 'select');
    if (idx >= 0) {
      this._queue[idx] = { kind: 'select', selectedGroupId };
    } else {
      this._queue.push({ kind: 'select', selectedGroupId });
    }
  }
}
