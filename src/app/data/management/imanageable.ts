import { Signal } from '@angular/core';

export interface ISpinnable {
  showProgressSpinner: Signal<boolean>;
}

export interface IManageable extends ISpinnable {
  saveNew(): void;

  resetDataNew(): void;

  areObjectsDirty(): boolean;
}
