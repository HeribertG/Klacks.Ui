// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ILiveMarkerDisplay } from './live-marker-display.interface';

export interface ILiveMarkerEntry {
  clientId: string;
  clientName: string;
  startTime: string;
  endTime: string;
  phone: string | null;
  imageDataUrl: string | null;
  color?: string;
  display: ILiveMarkerDisplay;
}
