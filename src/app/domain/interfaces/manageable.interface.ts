// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

export interface ISaveable {
  areObjectsDirty(): boolean;
  canSave?(): boolean;
  save(): void;
  onSaveCompleted?: () => void;
  /** The server refused the input: the form and what was typed stay, so the save is neither finished nor closed. */
  onSaveRefused?: () => void;
}
