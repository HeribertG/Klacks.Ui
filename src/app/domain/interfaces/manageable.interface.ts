export interface ISaveable {
  areObjectsDirty(): boolean;
  canSave?(): boolean;
  save(): void;
  onSaveCompleted?: () => void;
}

export interface IResettable {
  resetData(): void;
  readonly isReset: boolean;
}

export interface ILoadable {
  readonly showProgressSpinner: boolean;
}

export interface INavigable {
  goBack(): string;
}
