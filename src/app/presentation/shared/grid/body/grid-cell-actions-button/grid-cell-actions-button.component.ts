// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Touch-mode affordance rendered as a DOM overlay next to the selected grid cell. It exists because a
 * long press is invisible: a finger user cannot see that a context menu is reachable at all, and on
 * iPadOS Safari the browser never emits a native `contextmenu`. The button opens exactly the same menu
 * the long press and the right click open, so no menu logic is duplicated here - it only reports the
 * client position the menu should be anchored at. It is a sibling of the canvas rather than something
 * painted into it, which keeps the hit test with the browser and gives the affordance a name, a role
 * and a tab stop for free.
 * @param rect - Rectangle of the anchor cell relative to the grid box, or null when nothing is selected
 * @param bounds - Size of the grid box, used to keep the button inside the clipped overlay
 * @param visible - Whether the button should render at all (touch mode and no open cell editor)
 * @param open - Emits the client position at which the context menu should open
 */
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { TouchInteraction } from 'src/app/domain/constants/touch-interaction.constants';

export interface GridCellRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GridCellActionsBounds {
  width: number;
  height: number;
}

export interface GridCellActionsOpenEvent {
  clientX: number;
  clientY: number;
}

export const GRID_CELL_ACTIONS_LABEL_KEY = 'grid.cellActions';

const GRID_CELL_ACTIONS_TEST_ID = 'grid-cell-actions';
const CENTERING_DIVISOR = 2;

@Component({
  selector: 'app-grid-cell-actions-button',
  templateUrl: './grid-cell-actions-button.component.html',
  styleUrl: './grid-cell-actions-button.component.scss',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridCellActionsButtonComponent {
  readonly rect = input<GridCellRect | null>(null);
  readonly bounds = input<GridCellActionsBounds | null>(null);
  readonly visible = input<boolean>(false);

  readonly open = output<GridCellActionsOpenEvent>();

  readonly size = TouchInteraction.MinTargetPx;
  readonly labelKey = GRID_CELL_ACTIONS_LABEL_KEY;
  readonly testId = GRID_CELL_ACTIONS_TEST_ID;

  readonly left = computed(() => {
    const rect = this.rect();
    if (!rect) {
      return 0;
    }
    return this.clamp(rect.left + rect.width, this.bounds()?.width);
  });

  readonly top = computed(() => {
    const rect = this.rect();
    if (!rect) {
      return 0;
    }
    return this.clamp(rect.top - (this.size - rect.height) / CENTERING_DIVISOR, this.bounds()?.height);
  });

  onClick(button: HTMLButtonElement, event: MouseEvent): void {
    event.stopPropagation();
    const anchor = button.getBoundingClientRect();
    this.open.emit({ clientX: anchor.left, clientY: anchor.bottom });
  }

  private clamp(value: number, limit: number | undefined): number {
    const lowerBounded = Math.max(0, value);
    if (limit === undefined || limit === null) {
      return lowerBounded;
    }
    return Math.min(lowerBounded, Math.max(0, limit - this.size));
  }
}
