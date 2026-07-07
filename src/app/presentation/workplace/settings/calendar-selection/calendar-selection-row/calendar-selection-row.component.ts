// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single row of the calendar selection settings list.
 * @param data - The calendar selection displayed in this row
 * @param canDelete - Whether the delete button is enabled for this row
 * @param deleteDisabledReasonKey - Translation key shown as tooltip when deletion is disabled
 */
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection-class';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-calendar-selection-row',
  standalone: true,
  imports: [FormsModule, TranslateModule, TrashIconRedComponent],
  templateUrl: './calendar-selection-row.component.html',
  styleUrls: ['./calendar-selection-row.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarSelectionRowComponent {
  readonly data = input.required<ICalendarSelection>();
  readonly canDelete = input(true);
  readonly deleteDisabledReasonKey = input('');
  readonly editEvent = output<ICalendarSelection>();
  readonly isDeleteEvent = output<ICalendarSelection>();

  onClickEdit(): void {
    this.editEvent.emit(this.data());
  }

  onClickDelete(): void {
    if (this.canDelete()) {
      this.isDeleteEvent.emit(this.data());
    }
  }

  getCalendarSummary(): string {
    return this.data()
      .selectedCalendars.map((x) =>
        x.state === x.country ? x.country : `${x.country}-${x.state}`
      )
      .join(', ');
  }
}
