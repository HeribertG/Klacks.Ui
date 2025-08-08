import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { WorkplaceStateService } from 'src/app/presentation/workplace/core/workplace-state.service';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { FooterService } from 'src/app/presentation/services/footer.service';

@Component({
  selector: 'app-savebar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    @if (footerService.showFooter()) {
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

      @if (workplaceStateService.isDirty && !workplaceStateService.isDisabled) {
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
      } @if (workplaceStateService.isDirty) {
      <button
        type="button"
        class="btn save-btn"
        tabindex="0"
        (click)="onClickSave()"
        [disabled]="workplaceStateService.isDisabled"
        aria-label="Save changes"
      >
        {{ 'store' | translate }}
      </button>
      <button
        type="button"
        class="btn save-btn"
        tabindex="0"
        (click)="onClickSaveAndClose()"
        [disabled]="workplaceStateService.isDisabled"
        aria-label="Save changes and close"
      >
        {{ 'saveAndClose' | translate }}
      </button>
      }
    </div>
    }
  `,
  styleUrls: ['../home/home.component.scss'],
})
export class SavebarComponent {
  public workplaceStateService = inject(WorkplaceStateService);
  public footerService = inject(FooterService);
  private navigationService = inject(NavigationService);

  public showGoBackButton = computed(() => {
    return this.workplaceStateService.goBack() !== '';
  });

  onClickSave(): void {
    this.workplaceStateService.onClickSave();
  }

  onClickSaveAndClose(): void {
    this.workplaceStateService.onClickSave();
    setTimeout(() => {
      this.onClickGoBack();
    }, 500);
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
