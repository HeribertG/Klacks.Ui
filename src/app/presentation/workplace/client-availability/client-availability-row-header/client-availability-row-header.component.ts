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
import { ResizeDirective } from 'src/app/presentation/directives/resize.directive';
import { GridColorService } from 'src/app/domain/services/settings/grid-color.service';
import { GridFontsService } from 'src/app/presentation/shared/grid/services/grid-fonts.service';
import { DataManagementClientAvailabilityService } from 'src/app/domain/services/client-availability/data-management-client-availability.service';
import { DrawAvailabilityRowHeaderService } from '../services/draw-availability-row-header.service';

@Component({
  selector: 'app-client-availability-row-header',
  templateUrl: './client-availability-row-header.component.html',
  styleUrls: ['./client-availability-row-header.component.scss'],
  standalone: true,
  imports: [ResizeDirective],
})
export class ClientAvailabilityRowHeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  private drawRowHeader = inject(DrawAvailabilityRowHeaderService);
  private dataManagement = inject(DataManagementClientAvailabilityService);
  private gridColorService = inject(GridColorService);
  private gridFontsService = inject(GridFontsService);
  private injector = inject(Injector);

  private effects: EffectRef[] = [];

  valueChangeVScrollbar = input(0);

  ngOnInit(): void {
    this.readSignals();
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
    });
  }
}
