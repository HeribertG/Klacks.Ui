// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One holiday-work exemption in the settings list.
 * @param data - The exemption being displayed
 * @param scopeLabel - Resolved name of the scope, already translated by the caller
 */
import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  HolidayWorkExemption,
  IHolidayWorkExemption,
} from 'src/app/domain/models/scheduling/holiday-work-exemption.model';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';

@Component({
  selector: 'app-holiday-work-exemption-row',
  templateUrl: './holiday-work-exemption-row.component.html',
  styleUrls: ['./holiday-work-exemption-row.component.scss'],
  standalone: true,
  imports: [TrashIconRedComponent, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayWorkExemptionRowComponent {
  readonly data = input<IHolidayWorkExemption>(new HolidayWorkExemption());
  readonly scopeLabel = input('');
  readonly isDeleteEvent = output<void>();

  /**
   * Rows carrying an import identity came from a region package and are re-applied on the next
   * import, so deleting one is not necessarily permanent. Marking them is what keeps the list
   * honest - the backend does not refuse the delete.
   */
  readonly isImported = computed(() => this.data().importSourceKey.length > 0);

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }
}
