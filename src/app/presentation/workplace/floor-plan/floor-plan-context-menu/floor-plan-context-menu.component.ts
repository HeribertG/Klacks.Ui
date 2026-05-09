// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Floating right-click context menu for the floor plan canvas.
 * Displays shape-operation actions based on current selection state.
 * @param x - Left offset in pixels from the canvas wrapper left edge
 * @param y - Top offset in pixels from the canvas wrapper top edge
 */

import {
  Component,
  HostListener,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FloorPlanMergeService } from '../services/floor-plan-merge.service';

@Component({
  selector: 'app-floor-plan-context-menu',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './floor-plan-context-menu.component.html',
  styleUrls: ['./floor-plan-context-menu.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanContextMenuComponent {
  readonly mergeService = inject(FloorPlanMergeService);

  readonly isOpen = signal(false);
  readonly x = signal(0);
  readonly y = signal(0);

  private skipNextDocumentClick = false;

  open(x: number, y: number): void {
    this.x.set(x);
    this.y.set(y);
    this.isOpen.set(true);
    this.skipNextDocumentClick = true;
  }

  close(): void {
    this.isOpen.set(false);
  }

  onMerge(): void {
    this.mergeService.mergeSelected();
    this.close();
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.skipNextDocumentClick) {
      this.skipNextDocumentClick = false;
      return;
    }
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
