// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Holiday calendar and scheduling rule row of the contract dialog.
 * @param calendars - Selectable holiday calendars; passed in so the row refreshes once they have loaded
 * @param state - Editor state of the contract dialog
 * @param assignment - Calendar and scheduling rule handlers and labels
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection.interface';
import { ChooseCalendarComponent } from 'src/app/presentation/icons/choose-calendar.component';
import { ContractEditorStateService } from '../services/contract-editor-state.service';
import { ContractAssignmentService } from '../services/contract-assignment.service';

@Component({
  selector: 'app-contract-assignments',
  templateUrl: './contract-assignments.component.html',
  styleUrls: ['./contract-assignments.component.scss'],
  standalone: true,
  imports: [TranslateModule, NgbModule, ChooseCalendarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractAssignmentsComponent {
  readonly calendars = input.required<ICalendarSelection[]>();

  protected readonly state = inject(ContractEditorStateService);
  protected readonly assignment = inject(ContractAssignmentService);
}
