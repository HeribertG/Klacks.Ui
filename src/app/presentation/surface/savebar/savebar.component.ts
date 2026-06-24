// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Persistent save/reset bar shown at the bottom of edit workplaces.
 * @param showSaveButtons - controls visibility of save button
 * @param showSaveAndCloseButton - controls visibility of save-and-close button
 */
import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';

@Component({
  selector: 'app-savebar',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (savebarService.showSavebar()) {
    <div class="footer custom-control-inline">
      @if (showGoBackButton()) {
      <span
        type="button"
        class="link-button blue-font"
        role="button"
        tabindex="0"
        (click)="onClickGoBack()"
        (keydown.enter)="onClickGoBack()"
        (keydown.space)="onClickGoBack()"
        aria-label="Go back"
      >
        {{ 'back' | translate }}
      </span>
      }

      <div class="filler"></div>

      @if (workplaceStateService.isDirty) {
      <span
        type="button"
        class="link-button red-font"
        role="button"
        tabindex="0"
        (click)="onClickReset()"
        (keydown.enter)="onClickReset()"
        (keydown.space)="onClickReset()"
        aria-label="Reset changes"
      >
        {{ 'reset' | translate }}
      </span>
      } @if (savebarService.savebarConfig().showSaveButtons) {
      <button
        id="shift-save-btn"
        type="button"
        class="btn save-btn"
        tabindex="0"
        (click)="onClickSave()"
        [disabled]="!workplaceStateService.canSave || workplaceStateService.isDisabled || isShiftScenarioBlocked()"
        [title]="scenarioBlockTitle()"
        aria-label="Save changes"
      >
        {{ 'store' | translate }}
      </button>
      } @if (savebarService.savebarConfig().showSaveAndCloseButton) {
      <button
        id="shift-save-and-close-btn"
        type="button"
        class="btn save-btn"
        tabindex="0"
        (click)="onClickSaveAndClose()"
        [disabled]="!workplaceStateService.canSave || workplaceStateService.isDisabled || isShiftScenarioBlocked()"
        [title]="scenarioBlockTitle()"
        aria-label="Save changes and close"
      >
        {{ 'saveAndClose' | translate }}
      </button>
      }
    </div>
    }
  `,
  styleUrls: ['../home/home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavebarComponent {
  public workplaceStateService = inject(WorkplaceStateService);
  public savebarService = inject(SavebarService);
  private analyseScenarioService = inject(AnalyseScenarioService);
  private translateService = inject(TranslateService);
  private navigationService = inject(NavigationService);

  public showGoBackButton = computed(() => {
    return this.workplaceStateService.goBack() !== '';
  });

  public isShiftScenarioBlocked = computed(() => {
    if (!this.analyseScenarioService.isScenarioMode()) {
      return false;
    }
    const entity = this.workplaceStateService.nameOfVisibleEntity();
    return entity === EntityName.SHIFT_EDIT || entity === EntityName.SHIFT_CUT;
  });

  public scenarioBlockTitle = computed(() =>
    this.isShiftScenarioBlocked()
      ? this.translateService.instant('scenario.shiftEditBlocked')
      : ''
  );

  onClickSave(): void {
    this.workplaceStateService.onClickSave();
  }

  onClickSaveAndClose(): void {
    this.workplaceStateService.onClickSaveAndClose(() => this.onClickGoBack());
  }

  onClickReset(): void {
    this.workplaceStateService.reset();
  }

  onClickGoBack(): void {
    this.workplaceStateService.isDisabled = true;
    this.workplaceStateService.reset();
    setTimeout(() => {
      const backRoute = this.workplaceStateService.goBack();
      if (backRoute !== '') {
        this.navigationService.navigateToRouterToken(backRoute);
        return;
      }
      this.navigationService.navigateToRoot();
    }, 200);
  }
}
