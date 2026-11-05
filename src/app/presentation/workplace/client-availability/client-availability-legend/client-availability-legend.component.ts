// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Legend of the availability grid: shows the symbol of each of the four cell states with its meaning and explains
 * in a tooltip that the red cross also covers the hours blocked by the day rule, that the dash marks a column whose
 * hours differ, and how clicking and Ctrl-dragging change a cell.
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { CheckboxDrawingService } from '../services/render-availability-grid/checkbox-drawing.service';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';
import { AVAILABILITY_DISPLAY_STATE_LABEL_KEYS } from 'src/app/domain/constants/availability-display-state-labels.constants';
import { AvailabilityLegendEntry } from './availability-legend-entry.interface';

const LEGEND_HINT_TOOLTIP_KEY = 'client-availability.legend.hint';

const LEGEND_STATES: readonly { state: AvailabilityDisplayState; tooltipKey: string }[] = [
  { state: AvailabilityDisplayState.Available, tooltipKey: LEGEND_HINT_TOOLTIP_KEY },
  { state: AvailabilityDisplayState.Blocked, tooltipKey: 'client-availability.legend.blocked-tooltip' },
  { state: AvailabilityDisplayState.Mixed, tooltipKey: 'client-availability.legend.mixed-tooltip' },
  { state: AvailabilityDisplayState.Empty, tooltipKey: LEGEND_HINT_TOOLTIP_KEY },
];

@Component({
  selector: 'app-client-availability-legend',
  templateUrl: './client-availability-legend.component.html',
  styleUrls: ['./client-availability-legend.component.scss'],
  standalone: true,
  imports: [NgbTooltipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientAvailabilityLegendComponent {
  private checkboxDrawing = inject(CheckboxDrawingService);

  readonly entries = computed<AvailabilityLegendEntry[]>(() => {
    const urls = this.checkboxDrawing.symbolDataUrls();
    return LEGEND_STATES.map((entry) => ({
      labelKey: AVAILABILITY_DISPLAY_STATE_LABEL_KEYS[entry.state],
      tooltipKey: entry.tooltipKey,
      symbolUrl: urls.get(entry.state) ?? null,
    }));
  });
}
