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
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { FloorPlanMergeService } from '../services/floor-plan-merge.service';
import { FloorPlanJoinService } from '../services/floor-plan-join.service';
import { FloorPlanPointEditorService } from '../services/floor-plan-point-editor.service';
import { FloorPlanCanvasService } from '../services/floor-plan-canvas.service';

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
  readonly joinService = inject(FloorPlanJoinService);
  readonly pointEditorService = inject(FloorPlanPointEditorService);
  private readonly canvasService = inject(FloorPlanCanvasService);

  readonly canEditPoints = computed(() => {
    const obj = this.canvasService.selectedObject();
    if (!obj) return false;
    const data = (obj as any).data;
    if (!data) return false;
    return !data.isConnector && !data.isPortIndicator && !data.isPointHandle && !data.isArrowhead && !data.isMidpointHandle;
  });

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

  onJoin(): void {
    this.joinService.joinSelected();
    this.close();
  }

  onEditPoints(): void {
    const obj = this.canvasService.selectedObject();
    if (!obj) return;
    this.close();
    this.pointEditorService.enterEditMode(obj);
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
