// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ScheduleEffectsHost {
  refreshSurface(resetScroll?: boolean): void;
  setVScrollbarSize(size: number): void;
  setHScrollbarSize(size: number): void;
  scrollToClient(clientId: string, date: string): void;
  scrollToScheduleEntry(shiftId: string, column: number): void;
  readonly defaultVScrollbarSize: number;
  readonly defaultHScrollbarSize: number;
  readZoom(): number;
  readRefreshTrigger(): boolean;
}
