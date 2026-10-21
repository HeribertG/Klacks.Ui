// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface TimelineItem {
  start: number;
  end: number;
  isTask: boolean;
  label: string | null;
}
