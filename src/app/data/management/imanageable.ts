import { Signal } from '@angular/core';

export interface ISpinnable {
  showProgressSpinner: Signal<boolean>;
}

export interface IManageable extends ISpinnable {
  save(): void;

  resetData(): void;

  areObjectsDirty(): boolean;

  goBack(): string;
  
  onSaveCompleted?: () => void;
}
