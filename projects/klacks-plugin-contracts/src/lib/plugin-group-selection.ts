// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Read access to the host's currently selected group filter for plugins.
 * The host wires this to its global GroupSelectionService so plugins can
 * react to the same group picker that drives Schedule, Absence, etc.
 *
 * @param selectedGroupId - Reactive signal returning the selected group's id, or null when "All groups" is active
 * @param clearSelection - Resets the host's selection to "All groups"
 */

import { Signal } from '@angular/core';

export interface IPluginGroupSelection {
  selectedGroupId: Signal<string | null>;
  clearSelection(): void;
}
