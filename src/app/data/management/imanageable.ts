import { Signal } from '@angular/core';

export interface IManageable {
  isDirtyNew: Signal<boolean>;

  showProgressSpinnerNew: Signal<boolean>;

  saveNew(): void;

  resetDataNew(): void;
}
