// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Body of the absence time dialog of the container template editor: start and end time of a selected absence item.
 * It is rendered inside the absence ng-template of the container template component, reads the absence service that
 * component provides and marks its OnPush view in ngDoCheck, so it is refreshed whenever the dialog view is checked like
 * the inline template it replaces, because the edited times live in plain service fields.
 * @param modal - The open dialog; dismiss cancels, close saves the edited times
 * @param absenceService - Dialog title and the edited start and end time
 */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DoCheck, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { ContainerTemplateAbsenceService } from '../services/container-template-absence.service';

@Component({
  selector: 'app-container-template-absence-time-dialog',
  imports: [TranslateModule, TimeInputComponent],
  templateUrl: './container-template-absence-time-dialog.component.html',
  styleUrl: './container-template-absence-time-dialog.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerTemplateAbsenceTimeDialogComponent implements DoCheck {
  readonly modal = input.required<NgbActiveModal>();

  protected readonly absenceService = inject(ContainerTemplateAbsenceService);

  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  ngDoCheck(): void {
    this.changeDetectorRef.markForCheck();
  }
}
