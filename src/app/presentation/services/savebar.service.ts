// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { WorkplaceStateService } from '../../application/services/workplace-state.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';

export interface SavebarConfig {
  showSavebar: boolean;
  showGoBackButton: boolean;
  showSaveButtons: boolean;
  showSaveAndCloseButton: boolean;
  showResetButton: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SavebarService {
  private workplaceState = inject(WorkplaceStateService);

  private _showSavebar = signal<boolean>(false);

  public showSavebar = computed(() => this._showSavebar());
  public showGoBackButton = computed(() => this.workplaceState.goBack() !== '');
  public goBackRoute = computed(() => this.workplaceState.goBack());
  public isDirty = computed(() => this.workplaceState.isDirty);
  public isDisabled = computed(() => this.workplaceState.isDisabled);

  public savebarConfig = computed<SavebarConfig>(() => ({
    showSavebar: this._showSavebar(),
    showGoBackButton: this.showGoBackButton(),
    showSaveButtons: this.isDirty(),
    showSaveAndCloseButton:
      this.isDirty() && this.shouldShowSaveAndCloseButton(),
    showResetButton: this.isDirty() && !this.isDisabled(),
  }));

  private shouldShowSaveAndCloseButton(): boolean {
    const entityName = this.workplaceState.nameOfVisibleEntity();
    return (
      entityName !== EntityName.SETTINGS && entityName !== EntityName.PROFILE
    );
  }

  constructor() {
    effect(() => {
      this.updateSavebarHeight(this._showSavebar());
    });
  }

  public setSavebarVisibility(show: boolean): void {
    this._showSavebar.set(show);
  }

  private updateSavebarHeight(show: boolean): void {
    const body = document.querySelector('body');
    if (body) {
      body.style.setProperty('--savebar_height', show ? '65px' : '0px');
    }
  }
}
