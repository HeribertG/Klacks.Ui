/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Injectable,
  effect,
  inject,
  signal,
  computed,
  EffectRef,
} from '@angular/core';
import {
  ILoadable,
  IResettable,
  ISaveable,
  INavigable,
} from 'src/app/domain/interfaces/manageable.interface';
import { IEntityStateProvider } from 'src/app/domain/interfaces/entity-state-provider.interface';
import { ILoadingIndicator } from 'src/app/domain/interfaces/loading-indicator.interface';
import { SpinnerService } from 'src/app/presentation/spinner/spinner.service';
import { ManageableServiceFactory } from './manageable-service.factory';
import {
  EntityName,
  RouteName,
  isValidRouteName,
} from 'src/app/domain/models/entity-names.enum';
import { environment } from 'src/environments/environment';

function isSaveable(manager: any): manager is ISaveable {
  return (
    manager &&
    typeof manager.areObjectsDirty === 'function' &&
    typeof manager.save === 'function'
  );
}

function isResettable(manager: any): manager is IResettable {
  return (
    manager &&
    typeof manager.resetData === 'function' &&
    manager.isReset !== undefined
  );
}

function isNavigable(manager: any): manager is INavigable {
  return manager && typeof manager.goBack === 'function';
}

@Injectable({
  providedIn: 'root',
})
export class WorkplaceStateService implements IEntityStateProvider {
  private spinnerService = inject(SpinnerService as new (...args: any[]) => ILoadingIndicator);
  private manageableServiceFactory = inject(ManageableServiceFactory);

  public activeManager = signal<ILoadable | null>(null);
  private activeRoute = signal<RouteName | string>('');

  private static readonly ROUTE_ENTITY_MAP: Record<RouteName, EntityName> = {
    [RouteName.CLIENT]: EntityName.CLIENT,
    [RouteName.EDIT_ADDRESS]: EntityName.CLIENT_EDIT,
    [RouteName.PROFILE]: EntityName.PROFILE,
    [RouteName.SETTINGS]: EntityName.SETTINGS,
    [RouteName.GROUP]: EntityName.GROUP,
    [RouteName.EDIT_GROUP]: EntityName.GROUP_EDIT,
    [RouteName.GROUP_STRUCTURE]: EntityName.GROUP_STRUCTURE,
    [RouteName.SHIFT]: EntityName.SHIFT,
    [RouteName.NEW_SHIFT]: EntityName.SHIFT_EDIT,
    [RouteName.EDIT_SHIFT]: EntityName.SHIFT_EDIT,
    [RouteName.CUT_SHIFT]: EntityName.SHIFT_CUT,
    [RouteName.SCHEDULE]: EntityName.SCHEDULE,
    [RouteName.ABSENCE]: EntityName.ABSENCE,
  };

  public showProgressSpinnerNew = computed(
    () => this.activeManager()?.showProgressSpinner ?? false
  );

  private _isDirty = signal<boolean>(false);
  private _canSave = signal<boolean>(false);
  private _isDisabled = signal<boolean>(false);
  private _isSavedOrReset = signal<boolean>(false);

  public isFocusChanged = signal<boolean>(false);

  public get isDirty(): boolean {
    return this._isDirty();
  }

  public set isDirty(value: boolean) {
    this._isDirty.set(value);
  }

  public get canSave(): boolean {
    return this._canSave();
  }

  public set canSave(value: boolean) {
    this._canSave.set(value);
  }

  public get isDisabled(): boolean {
    return this._isDisabled();
  }

  public set isDisabled(value: boolean) {
    this._isDisabled.set(value);
  }

  public get isSavedOrReset(): boolean {
    return this._isSavedOrReset();
  }

  public set isSavedOrReset(value: boolean) {
    this._isSavedOrReset.set(value);
  }

  public nameOfVisibleEntity = computed(() => {
    const route = this.activeRoute();
    return isValidRouteName(route)
      ? WorkplaceStateService.ROUTE_ENTITY_MAP[route]
      : '';
  });

  private _isGroupSearchVisible = signal<boolean>(false);

  public isSearchVisible = computed(() => {
    const route = this.activeRoute();

    if (route === RouteName.GROUP) {
      return this._isGroupSearchVisible();
    }

    return true;
  });

  public setGroupSearchVisible(visible: boolean): void {
    this._isGroupSearchVisible.set(visible);
  }

  private effectRefs: EffectRef[] = [];

  constructor() {
    this.readEffects();
  }

  public setActiveManagerByRoute(routeId: RouteName | string): void {
    const manager = this.manageableServiceFactory.getService(routeId);
    this.activeManager.set(manager);
    this.activeRoute.set(routeId);
  }

  public showProgressSpinner(value: boolean): void {
    this.spinnerService.showProgressSpinner = value;
  }

  areObjectsDirty(): void {
    this.checkObjectDirty();
  }

  checkIfDirtyIsNecessary(): void {
    if (this.isDirty && this.isSavedOrReset) {
      this.checkObjectDirty();
    }

    if (!this.isDirty) {
      this.isSavedOrReset = false;
      this.isDisabled = false;
    }
  }

  public actualPage(): string {
    const route = this.activeRoute();

    switch (route) {
      case RouteName.ABSENCE:
        return 'gantt';
      case RouteName.SCHEDULE:
        return 'schedule';
      default:
        return '';
    }
  }

  private checkObjectDirty(): void {
    let isDirty = false;
    let canSave = false;

    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if (isSaveable(manager)) {
        isDirty = manager.areObjectsDirty();
        canSave = manager.canSave ? manager.canSave() : isDirty;
      } else {
        isDirty = false;
        canSave = false;
      }
    } else {
      isDirty = false;
      canSave = false;
    }

    this._isDirty.set(isDirty);
    this._canSave.set(canSave);

    if (!isDirty) {
      this._isDisabled.set(false);
      this.showProgressSpinner(false);
    }
  }

  onClickSave(): void {
    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if (isSaveable(manager)) {
        manager.onSaveCompleted = () => {
          this._isDisabled.set(false);
          this._isSavedOrReset.set(true);
        };
        this._isDisabled.set(true);
        manager.save();
      } else {
        if (!environment.production) {
          console.warn(
            'Active manager does not implement ISaveable (no save functionality)'
          );
        }
      }
    } else {
      if (!environment.production) {
        console.warn('No active manager available for save operation');
      }
    }
  }

  reset(): void {
    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if (isResettable(manager)) {
        manager.resetData();
        this._isSavedOrReset.set(true);
      } else {
        if (!environment.production) {
          console.warn(
            'Active manager does not implement IResettable (no reset functionality)'
          );
        }
      }
    } else {
      if (!environment.production) {
        console.warn('No active manager available for reset operation');
      }
    }
  }

  goBack(): string {
    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if (isNavigable(manager)) {
        return manager.goBack();
      }
    }
    return '';
  }

  resetAllSignals(): void {
    this._isDirty.set(false);
    this._isDisabled.set(false);
    this._isSavedOrReset.set(false);
    this.isFocusChanged.set(false);
  }

  destroy(): void {
    this.effectRefs.forEach((ref) => ref.destroy());
    this.effectRefs = [];
  }

  private readEffects(): void {
    const spinnerEffect = effect(() => {
      const shouldShow = this.showProgressSpinnerNew();
      this.showProgressSpinner(shouldShow);
    });
    this.effectRefs.push(spinnerEffect);

    const dirtyCleanupEffect = effect(() => {
      const isDirty = this._isDirty();
      const isSavedOrReset = this._isSavedOrReset();

      if (isDirty && isSavedOrReset) {
        this.checkObjectDirty();
      }

      if (!isDirty) {
        this._isSavedOrReset.set(false);
        this._isDisabled.set(false);
      }
    });
    this.effectRefs.push(dirtyCleanupEffect);
  }
}
