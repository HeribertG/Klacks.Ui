// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Core data structures for the evolutionary scheduling engine (shifts, agents,
 * scenarios, config, penalty weights, progress/result payloads and callbacks).
 */

export interface CoreShift {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  requiredAssignments: number;
  priority: number;
}
