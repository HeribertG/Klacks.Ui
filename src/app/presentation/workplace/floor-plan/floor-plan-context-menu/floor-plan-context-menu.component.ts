// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Floating right-click context menu for the floor plan canvas.
 * Renders at document body level to escape modal overflow and transform constraints.
 * @param x - Viewport x coordinate (clientX) for menu placement
 * @param y - Viewport y coordinate (clientY) for menu placement
 */

import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Rect, Circle, Polygon, Path, Line } from 'fabric';
import { FabricWithData } from '../services/floor-plan-object-data.interface';
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
  encapsulation: ViewEncapsulation.None,
})
export class FloorPlanContextMenuComponent implements OnInit, OnDestroy {
  readonly mergeService = inject(FloorPlanMergeService);
  readonly joinService = inject(FloorPlanJoinService);
  readonly pointEditorService = inject(FloorPlanPointEditorService);
  private readonly canvasService = inject(FloorPlanCanvasService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly canClosePath = computed(() => {
    const obj = this.canvasService.selectedObject();
    if (!(obj instanceof Path)) return false;
    const cmds = (obj as Path & { path: (string | number)[][] }).path;
    return !cmds.some((cmd: (string | number)[]) => cmd[0] === 'Z');
  });

  readonly canEditPoints = computed(() => {
    const obj = this.canvasService.selectedObject();
    if (!obj) return false;
    const data = (obj as FabricWithData).data;
    if (!data) return false;
    if (data.isConnector || data.isPortIndicator || data.isPointHandle ||
        data.isArrowhead || data.isMidpointHandle) return false;
    return obj instanceof Rect || obj instanceof Circle ||
           obj instanceof Polygon || obj instanceof Path || obj instanceof Line;
  });

  readonly canPaste = computed(() => this.canvasService.hasClipboard());

  readonly isOpen = signal(false);
  readonly x = signal(0);
  readonly y = signal(0);

  private skipNextClose = false;

  ngOnInit(): void {
    document.body.appendChild(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    const el = this.elementRef.nativeElement;
    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }
  }

  open(x: number, y: number): void {
    this.x.set(x);
    this.y.set(y);
    this.isOpen.set(true);
    this.skipNextClose = true;
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

  onClosePath(): void {
    this.canvasService.closeSelectedPath();
    this.close();
  }

  onCopy(): void {
    this.canvasService.copySelected();
    this.close();
  }

  async onPaste(): Promise<void> {
    await this.canvasService.paste();
    this.close();
  }

  onFlipH(): void {
    this.canvasService.flipHorizontal();
    this.close();
  }

  onFlipV(): void {
    this.canvasService.flipVertical();
    this.close();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMousedown(event: MouseEvent): void {
    if (event.button !== 0) return;
    if (this.skipNextClose) {
      this.skipNextClose = false;
      return;
    }
    if (!this.isOpen()) return;
    this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
