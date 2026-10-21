// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface SubBreakResource {
  id: string;
  absenceId: string;
  clientId: string;
  currentDate: string;
  startTime: string;
  endTime: string;
  workTime: number;
  parentWorkId: string;
  absence?: {
    id: string;
    name: Record<string, string>;
    abbreviation: Record<string, string>;
    color: string;
    description: Record<string, string>;
    appliesToContainer: boolean;
    isUnpaid: boolean;
  };
}
