import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { WorkplaceStateService } from '../presentation/workplace/core/workplace-state.service';

export interface FooterConfig {
  showFooter: boolean;
  showGoBackButton: boolean;
  showSaveButtons: boolean;
  showResetButton: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FooterService {
  private workplaceState = inject(WorkplaceStateService);

  private _showFooter = signal<boolean>(false);

  public showFooter = computed(() => this._showFooter());
  public showGoBackButton = computed(() => this.workplaceState.goBack() !== '');
  public goBackRoute = computed(() => this.workplaceState.goBack());
  public isDirty = computed(() => this.workplaceState.isDirty);
  public isDisabled = computed(() => this.workplaceState.isDisabled);

  public footerConfig = computed<FooterConfig>(() => ({
    showFooter: this._showFooter(),
    showGoBackButton: this.showGoBackButton(),
    showSaveButtons: this.isDirty(),
    showResetButton: this.isDirty() && !this.isDisabled(),
  }));

  constructor() {
    effect(() => {
      this.updateFooterHeight(this._showFooter());
    });
  }

  public setFooterVisibility(show: boolean): void {
    this._showFooter.set(show);
  }

  private updateFooterHeight(show: boolean): void {
    const body = document.querySelector('body');
    if (body) {
      body.style.setProperty('--footer_height', show ? '65px' : '0px');
    }
  }
}
