// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import {
  AfterViewInit,
  Component,
  EffectRef,
  Injector,
  OnDestroy,
  OnInit,
  effect,
  inject,
  input,
  runInInjectionContext,
} from '@angular/core';
import { NgStyle } from '@angular/common';
import { Size } from 'src/app/shared/helpers/geometry.helper';
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DrawHelper } from 'src/app/presentation/helpers/draw-helper';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { DrawAvailabilityRowHeaderService } from '../services/draw-availability-row-header.service';
import { ClientAvailabilityFilterService } from 'src/app/domain/services/client-availability/client-availability-filter.service';
import { ClientFilterComponent } from 'src/app/presentation/shared/client-filter/client-filter.component';
import { CursorEnum } from 'src/app/presentation/shared/grid/enums/cursor_enums';
import { RenderAvailabilityGridService } from '../services/render-availability-grid';

@Component({
  selector: 'app-client-availability-row-header',
  templateUrl: './client-availability-row-header.component.html',
  styleUrls: ['./client-availability-row-header.component.scss'],
  standalone: true,
  imports: [ResizeDirective, NgStyle, ClientFilterComponent],
})
export class ClientAvailabilityRowHeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  private drawRowHeader = inject(DrawAvailabilityRowHeaderService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private gridColorService = inject(GridColorService);
  private gridFontsService = inject(GridFontsService);
  private injector = inject(Injector);
  private renderGrid = inject(RenderAvailabilityGridService);

  public filterService = inject(ClientAvailabilityFilterService);

  private effects: EffectRef[] = [];

  valueChangeVScrollbar = input(0);

  filterStyle: Record<string, string> = {};

  private set currentCursor(cursor: CursorEnum) {
    document.body.style.cursor = cursor;
  }

  private get currentCursor(): CursorEnum {
    return document.body.style.cursor as CursorEnum;
  }

  ngOnInit(): void {
    this.readSignals();
    this.destroyFilter();

    this.drawRowHeader.filterImage = DrawHelper.createImage(
      new Size(this.drawRowHeader.iconSize, this.drawRowHeader.iconSize),
      'assets/svg/sorting.svg'
    );
  }

  ngAfterViewInit(): void {
    this.drawRowHeader.createCanvas('availability-row-header-canvas');
  }

  ngOnDestroy(): void {
    this.effects.forEach((ref) => {
      if (ref) {
        ref.destroy();
      }
    });
    this.effects = [];
    this.drawRowHeader.destroy();
    this.drawRowHeader.deleteCanvas();
  }

  onResize(entries: ResizeObserverEntry[]): void {
    if (!entries || entries.length === 0) return;
    const entry = entries[0];

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.drawRowHeader.width = entry.contentRect.width;
        this.drawRowHeader.height = entry.contentRect.height;
        this.redrawComponents();
      });
    });
  }

  onMouseMove(event: MouseEvent): void {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.currentCursor = CursorEnum.pointer;
      } else {
        this.currentCursor = CursorEnum.default;
      }
    }
  }

  onClick(event: MouseEvent): void {
    const pos = this.getMousePos(event);
    if (!pos) return;

    if (this.drawRowHeader.recFilterIcon) {
      if (this.drawRowHeader.recFilterIcon.pointInRect(pos.x, pos.y)) {
        this.showFilter();
      }
    }
  }

  onMouseLeave(): void {
    this.destroyFilter();
  }

  onFilterChange(): void {
    this.applyFilterAndRender();
  }

  showFilter(): void {
    const canvas = this.drawRowHeader.rowHeaderCanvasManager.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const leftPos = rect.left;

    this.filterStyle = {
      visibility: 'visible',
      left: leftPos + 'px',
      top:
        this.drawRowHeader.recFilterIcon.top +
        this.drawRowHeader.recFilterIcon.height +
        rect.top +
        'px',
    };
  }

  destroyFilter(): void {
    this.filterStyle = {
      visibility: 'hidden',
    };
  }

  private getMousePos(event: MouseEvent): { x: number; y: number } | undefined {
    const canvas = this.drawRowHeader.rowHeaderCanvasManager.canvas;
    if (!canvas) return undefined;

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private applyFilterAndRender(): void {
    const filtered = this.filterService.getFilteredClients();
    this.renderGrid.setClients(
      filtered.map((c) => ({ id: c.id, displayName: c.displayName }))
    );
    this.filterService.applyFilters();
  }

  private redrawComponents(): void {
    if (!this.drawRowHeader.isCanvasAvailable()) return;
    this.drawRowHeader.drawRowHeader();
  }

  private readSignals(): void {
    runInInjectionContext(this.injector, () => {
      const isReadEffect = effect(() => {
        const isRead = this.dataManagement.isRead();
        if (isRead) {
          if (!this.drawRowHeader.isCanvasAvailable()) {
            return;
          }
          this.drawRowHeader.drawRowHeader();
        }
      });
      this.effects.push(isReadEffect);

      const scrollEffect = effect(() => {
        const scrollY = this.valueChangeVScrollbar();
        this.drawRowHeader.moveVertical(scrollY);
      });
      this.effects.push(scrollEffect);

      const colorResetEffect = effect(() => {
        const isReset = this.gridColorService.isReset();
        if (isReset) {
          this.redrawComponents();
        }
      });
      this.effects.push(colorResetEffect);

      const fontResetEffect = effect(() => {
        const isReset = this.gridFontsService.isReset();
        if (isReset) {
          this.redrawComponents();
        }
      });
      this.effects.push(fontResetEffect);

      const filterEffect = effect(() => {
        const changed = this.filterService.clientsChanged();
        if (changed && this.drawRowHeader.isCanvasAvailable()) {
          this.drawRowHeader.drawRowHeader();
        }
      });
      this.effects.push(filterEffect);
    });
  }
}
