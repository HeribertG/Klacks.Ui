// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-unused-vars */
// resize-table.directive.ts
import {
  Directive,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  inject,
  input
} from '@angular/core';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { measureTableHeight } from 'src/app/presentation/helpers/tableResize';
import { isNumeric } from 'src/app/shared/helpers/number.helper';
import { DomainMessages } from 'src/app/domain/constants/messages';

@Directive({
  selector: '[appResizeTable]',
  standalone: true,
  exportAs: 'resizeTable',
})
export class ResizeTableDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private localStorageService = inject(LocalStorageService);

  readonly defaultItemsPerPage = input(5);
  readonly minItemsPerPage = input(5);
  readonly maxItems = input(0);
  readonly currentPage = input(1);

  @Output() itemsPerPageChange = new EventEmitter<number>();
  @Output() recalculateRequired = new EventEmitter<boolean>();

  private resizeObserver: ResizeObserver | null = null;
  private windowResizeListener: (() => void) | null = null;
  private realRow = -1;
  private isMeasureTable = false;

  ngOnInit(): void {
    const savedRow = this.localStorageService.get(
      DomainMessages.SELECTED_ROW_ORDER
    );
    if (savedRow && isNumeric(savedRow)) {
      this.realRow = +savedRow;
      if (this.realRow !== -1) {
        this.itemsPerPageChange.emit(this.realRow);
      }
    }

    this.setupResizeObserver();

    this.windowResizeListener = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.windowResizeListener, true);

    setTimeout(() => this.recalcHeight(), 100);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.windowResizeListener) {
      window.removeEventListener('resize', this.windowResizeListener, true);
    }
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this.isMeasureTable) {
          this.isMeasureTable = false;
          setTimeout(() => this.recalcHeight(true), 100);
        }
      }
    });

    this.resizeObserver.observe(this.elementRef.nativeElement);
  }

  private onWindowResize(): void {
    setTimeout(() => this.recalcHeight(), 100);
  }

  recalcHeight(isSecondRead = false): void {
    if (this.elementRef.nativeElement) {
      const addLine = measureTableHeight(this.elementRef);

      if (!addLine || this.realRow !== -1) {
        if (!isSecondRead) {
          this.recalculateRequired.emit(false);
        }
        return;
      }

      const currentItemsPerPage = this.defaultItemsPerPage();
      let newItemsPerPage = this.minItemsPerPage();

      // Calculate the optimal number of items per page based on available space
      if (addLine.lines > this.minItemsPerPage()) {
        // If we can fit more than the minimum, use the calculated lines
        // But don't exceed the total number of items available
        if (this.maxItems() > 0) {
          newItemsPerPage = Math.min(addLine.lines, this.maxItems());
        } else {
          newItemsPerPage = addLine.lines;
        }
      }

      // Always emit the new value to ensure filter gets initialized
      this.itemsPerPageChange.emit(newItemsPerPage);

      if (!isSecondRead) {
        this.recalculateRequired.emit(false);
      } else if (currentItemsPerPage !== newItemsPerPage) {
        this.recalculateRequired.emit(true);
      }
    }
  }

  onRowSizeChange(value: number): void {
    this.realRow = value;

    if (value === -1) {
      localStorage.removeItem(DomainMessages.SELECTED_ROW_ORDER);
      setTimeout(() => this.recalcHeight(), 100);
    } else {
      localStorage.setItem(DomainMessages.SELECTED_ROW_ORDER, value.toString());
      this.itemsPerPageChange.emit(value);
    }
  }

  triggerMeasurement(): void {
    this.isMeasureTable = true;
  }
}
