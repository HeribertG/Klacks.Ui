// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Signal } from '@angular/core';

export interface ISaveable {
  areObjectsDirty(): boolean;
  canSave?(): boolean;
  save(): void;
  onSaveCompleted?: () => void;
}

export interface IResettable {
  resetData(): void;
  isReset: Signal<boolean>;
}

export interface ILoadable {
  showProgressSpinner: Signal<boolean>;
}

export interface INavigable {
  goBack(): string;
}
