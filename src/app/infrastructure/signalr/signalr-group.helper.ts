// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Group membership helper for SignalR: join, leave and rejoin schedule groups.
 * Hub connection and isConnected state are passed as parameters to avoid owning connection state.
 */
import * as signalR from '@microsoft/signalr';
import { SignalRConstants } from './signalr.constants';

interface ScheduleGroup {
  startDate: string;
  endDate: string;
  analyseToken: string | null;
}

export class SignalRGroupHelper {
  private _currentGroup: ScheduleGroup | null = null;
  private _pendingGroupSwitch: Promise<void> | null = null;

  get currentGroup(): ScheduleGroup | null {
    return this._currentGroup;
  }

  async joinScheduleGroup(
    hub: signalR.HubConnection,
    isConnected: boolean,
    startDate: string,
    endDate: string,
    analyseToken: string | null,
  ): Promise<void> {
    if (this._pendingGroupSwitch) {
      await this._pendingGroupSwitch;
    }
    this._pendingGroupSwitch = this.performGroupSwitch(hub, isConnected, startDate, endDate, analyseToken);
    try {
      await this._pendingGroupSwitch;
    } finally {
      this._pendingGroupSwitch = null;
    }
  }

  async leaveScheduleGroup(
    hub: signalR.HubConnection,
    isConnected: boolean,
    startDate: string,
    endDate: string,
    analyseToken: string | null,
  ): Promise<void> {
    if (!hub || !isConnected) return;

    try {
      await hub.invoke(
        SignalRConstants.HubMethods.LeaveScheduleGroup,
        startDate,
        endDate,
        analyseToken ?? '',
      );
      if (
        this._currentGroup?.startDate === startDate &&
        this._currentGroup?.endDate === endDate &&
        this._currentGroup?.analyseToken === analyseToken
      ) {
        this._currentGroup = null;
      }
    } catch {
      // ignored
    }
  }

  async setSelectedGroup(
    hub: signalR.HubConnection,
    isConnected: boolean,
    selectedGroupId: string,
  ): Promise<void> {
    if (!hub || !isConnected) return;
    try {
      await hub.invoke(SignalRConstants.HubMethods.SetSelectedGroup, selectedGroupId);
    } catch {
      // ignored
    }
  }

  async rejoinCurrentGroup(hub: signalR.HubConnection, isConnected: boolean): Promise<void> {
    if (!this._currentGroup || !isConnected) return;
    const { startDate, endDate, analyseToken } = this._currentGroup;
    this._currentGroup = null;
    await this.joinScheduleGroup(hub, isConnected, startDate, endDate, analyseToken);
  }

  private async performGroupSwitch(
    hub: signalR.HubConnection,
    isConnected: boolean,
    startDate: string,
    endDate: string,
    analyseToken: string | null,
  ): Promise<void> {
    if (!hub || !isConnected) {
      this._currentGroup = { startDate, endDate, analyseToken };
      return;
    }

    if (this._currentGroup) {
      await this.leaveScheduleGroup(
        hub, isConnected,
        this._currentGroup.startDate,
        this._currentGroup.endDate,
        this._currentGroup.analyseToken,
      );
    }

    try {
      await hub.invoke(
        SignalRConstants.HubMethods.JoinScheduleGroup,
        startDate, endDate, analyseToken ?? '',
      );
      this._currentGroup = { startDate, endDate, analyseToken };
    } catch {
      this._currentGroup = { startDate, endDate, analyseToken };
    }
  }
}
