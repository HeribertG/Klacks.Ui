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

@Injectable({
  providedIn: 'root',
})
export class DataManagementSwitchboardService {
  private spinnerService = inject(SpinnerService);
  private manageableServiceFactory = inject(ManageableServiceFactory);

  public activeManager = signal<ISpinnable | null>(null);

  public showProgressSpinnerNew = computed(
    () => this.activeManager()?.showProgressSpinner() ?? false
  );

  private _nameOfVisibleEntity = signal<string>('');
  private _lastNameOfVisibleEntity = signal<string>('');
  private _isDirty = signal<boolean>(false);
  private _isDisabled = signal<boolean>(false);
  private _isSavedOrReset = signal<boolean>(false);
  private _isSearchVisible = signal<boolean>(true);

  public isFocusChanged = signal<boolean>(false);


  public get lastNameOfVisibleEntity(): string {
    return this._lastNameOfVisibleEntity();
  }

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

  public get isSearchVisible(): boolean {
    return this._isSearchVisible();
  }

  public set isSearchVisible(value: boolean) {
    this._isSearchVisible.set(value);
    this.isFocusChanged.set(true);
  }

  public get nameOfVisibleEntity(): string {
    return this._nameOfVisibleEntity();
  }

  public set nameOfVisibleEntity(value: string) {
    this._lastNameOfVisibleEntity.set(this._nameOfVisibleEntity());
    this._nameOfVisibleEntity.set(value);

    // Handle search visibility based on entity (legacy for non-migrated services)
    switch (value) {
      case 'DataManagementGroupService':
        this._isSearchVisible.set(false);
        break;
      default:
        this._isSearchVisible.set(true);
        break;
    }

    this.isFocusChanged.set(true);
  }

  private effectRefs: EffectRef[] = [];

  constructor() {
    this.readEffects();
  }

  /**
   * Sets the active manager based on the route identifier.
   * This method tries to find a registered IManageable service for the given route.
   * @param routeId - The route identifier (e.g., 'client', 'edit-address')
   */
  public setActiveManagerByRoute(routeId: string): void {
    const manager = this.manageableServiceFactory.getService(routeId);
    this.activeManager.set(manager);

    if (manager) {
      console.log(`Active manager set for route: ${routeId}`);
    } else {
      console.warn(
        `No IManageable service found for route: ${routeId}. Using legacy logic.`
      );
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
    // Simplified page detection based on route or active manager
    if (this.activeManager()) {
      // Could be enhanced to derive page from active manager type
      return '';
    }

    // Legacy logic for non-migrated services
    switch (this.nameOfVisibleEntity) {
      case 'DataManagementAbsenceGanttService':
        return 'gantt';
      case 'DataManagementScheduleService':
        return 'schedule';
      default:
        return '';
    }
  }

  private checkObjectDirty(): void {
    let isDirty = false;

    if (this.activeManager()) {
      // Check if the service implements IManageable (has areObjectsDirty method)
      const manager = this.activeManager()!;
      if ('areObjectsDirty' in manager) {
        isDirty = (manager as IManageable).areObjectsDirty();
      } else {
        // Service only implements ISpinnable, not dirty
        isDirty = false;
      }
    } else {
      // No active manager, not dirty
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
        console.warn('Active manager does not implement IManageable (no save functionality)');
      }
    } else {
      // No active manager, cannot save
      console.warn('No active manager available for save operation');
    }
  }

  reset(): void {
    if (this.activeManager()) {
      const manager = this.activeManager()!;
      if ('resetDataNew' in manager) {
        (manager as IManageable).resetDataNew();
        this._isSavedOrReset.set(true);
      } else {
        console.warn('Active manager does not implement IManageable (no reset functionality)');
      }
    } else {
      // No active manager, cannot reset
      console.warn('No active manager available for reset operation');
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
    // Spinner effect - now uses activeManager's showProgressSpinner
    const spinnerEffect = effect(() => {
      const shouldShow = this.showProgressSpinnerNew();
      this.showProgressSpinner(shouldShow);
    });
    this.effectRefs.push(spinnerEffect);

    // Auto-cleanup for dirty state
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
