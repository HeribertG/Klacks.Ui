// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Confirmation dialog asking the user whether to restore unsaved form data that
 * was captured before an authentication-loss redirect to the login page.
 * Closes with `true` when the user chooses to restore, dismisses otherwise.
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-draft-recovery-dialog',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-header">
      <h5 class="modal-title">{{ 'draft-recovery.title' | translate }}</h5>
    </div>
    <div class="modal-body">
      {{ 'draft-recovery.message' | translate }}
    </div>
    <div class="modal-footer">
      <button
        type="button"
        id="draft-recovery-discard-btn"
        class="btn btn-outline-secondary"
        (click)="activeModal.dismiss(false)"
      >
        {{ 'draft-recovery.discard' | translate }}
      </button>
      <button
        type="button"
        id="draft-recovery-restore-btn"
        class="btn btn-primary"
        (click)="activeModal.close(true)"
      >
        {{ 'draft-recovery.restore' | translate }}
      </button>
    </div>
  `,
})
export class DraftRecoveryDialogComponent {
  readonly activeModal = inject(NgbActiveModal);
}
