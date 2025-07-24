import {
  Injectable,
  effect,
  inject,
  signal,
  computed,
  EffectRef,
} from '@angular/core';
import { SpinnerService } from 'src/app/spinner/spinner.service';
import { IManageable, ISpinnable } from './imanageable';
import { ManageableServiceFactory } from './manageable-service.factory';
import { EntityName, RouteName, isValidRouteName } from './entity-names.enum';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DataManagementSwitchboardService {
  private spinnerService = inject(SpinnerService);
  private manageableServiceFactory = inject(ManageableServiceFactory);

  public activeManager = signal<ISpinnable | null>(null);
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
    () => this.activeManager()?.showProgressSpinner() ?? false
  );

  private _isDirty = signal<boolean>(false);
  private _isDisabled = signal<boolean>(false);
  private _isSavedOrReset = signal<boolean>(false);

  public isFocusChanged = signal<boolean>(false);


  public get isDirty(): boolean {
    return this._isDirty();
  }

  public set isDirty(value: boolean) {
    this._isDirty.set(value);
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
      ? DataManagementSwitchboardService.ROUTE_ENTITY_MAP[route]
      : '';
  });

  private _isGroupSearchVisible = signal<boolean>(true);

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

  /**
   * Sets the active manager based on the route identifier.
   * This method tries to find a registered IManageable service for the given route.
   * @param routeId - The route identifier from RouteName enum
   */
  public setActiveManagerByRoute(routeId: RouteName | string): void {
    const manager = this.manageableServiceFactory.getService(routeId);
    this.activeManager.set(manager);
    this.activeRoute.set(routeId);

    const currentName = this.nameOfVisibleEntity();

    this.isFocusChanged.set(true);

    if (!environment.production) {
      if (manager) {
        console.log(
          `Active manager set for route: ${routeId}, entity: ${currentName}`
        );
      } else {
        console.warn(
          `No IManageable service found for route: ${routeId}. Using legacy logic.`
        );
      }
    }
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

    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if ('areObjectsDirty' in manager) {
        isDirty = (manager as IManageable).areObjectsDirty();
      } else {
        isDirty = false;
      }
    } else {
      isDirty = false;
    }

    this._isDirty.set(isDirty);

    if (!isDirty) {
      this._isDisabled.set(false);
      this.showProgressSpinner(false);
    }
  }

  onClickSave(): void {
    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if ('saveNew' in manager) {
        (manager as IManageable).saveNew();
        this._isDisabled.set(true);
        this._isSavedOrReset.set(true);
      } else {
        if (!environment.production) {
          console.warn(
            'Active manager does not implement IManageable (no save functionality)'
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
      if ('resetDataNew' in manager) {
        (manager as IManageable).resetDataNew();
        this._isSavedOrReset.set(true);
      } else {
        if (!environment.production) {
          console.warn(
            'Active manager does not implement IManageable (no reset functionality)'
          );
        }
      }
    } else {
      if (!environment.production) {
        console.warn('No active manager available for reset operation');
      }
    }
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
