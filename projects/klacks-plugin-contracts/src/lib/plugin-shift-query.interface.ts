// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Query of a plugin for a list of shift definitions.
 * @param kind - Plain shifts or containers
 * @param maxCount - Maximum number of shifts returned
 * @param activeDateRange - Include shifts that are valid today
 * @param futureDateRange - Include shifts that become valid in the future
 */

import { PluginShiftKind } from './plugin-shift-kind.type';

export interface IPluginShiftQuery {
  kind: PluginShiftKind;
  maxCount: number;
  activeDateRange: boolean;
  futureDateRange: boolean;
}
