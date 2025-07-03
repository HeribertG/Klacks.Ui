/* eslint-disable @typescript-eslint/no-unused-vars */
// resize-table.directive.ts
import {
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { measureTableHeight } from 'src/app/helpers/tableResize';
import { isNumeric } from 'src/app/helpers/format-helper';
import { MessageLibrary } from 'src/app/helpers/string-constants';

@Directive({
  selector: '[appResizeTable]',
  standalone: true,
})
export class ResizeTableDirective implements OnInit, OnDestroy {
  private elementRef = inject(ElementRef);
  private localStorageService = inject(LocalStorageService);

  @Input() defaultItemsPerPage = 5;
  @Input() minItemsPerPage = 5;
  @Input() maxItems = 0;
  @Input() currentPage = 1;

  @Output() itemsPerPageChange = new EventEmitter<number>();
  @Output() recalculateRequired = new EventEmitter<boolean>();

  private resizeObserver: ResizeObserver | null = null;
  private windowResizeListener: (() => void) | null = null;
  private realRow = -1;
  private isMeasureTable = false;

  ngOnInit(): void {
    // Load saved row preference
    const savedRow = this.localStorageService.get(
      MessageLibrary.SELECTED_ROW_ORDER
    );
    if (savedRow && isNumeric(savedRow)) {
      this.realRow = +savedRow;
      if (this.realRow !== -1) {
        this.itemsPerPageChange.emit(this.realRow);
      }
    }

    // Setup ResizeObserver
    this.setupResizeObserver();

    // Setup window resize listener
    this.windowResizeListener = this.onWindowResize.bind(this);
    window.addEventListener('resize', this.windowResizeListener, true);

    // Initial calculation
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

      const currentItemsPerPage = this.defaultItemsPerPage;
      let newItemsPerPage = this.minItemsPerPage;

      if (this.currentPage * addLine.lines < this.maxItems) {
        if (addLine.lines > this.minItemsPerPage) {
          newItemsPerPage = addLine.lines;
        }
      }

      if (currentItemsPerPage !== newItemsPerPage) {
        this.itemsPerPageChange.emit(newItemsPerPage);
      }

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
      localStorage.removeItem(MessageLibrary.SELECTED_ROW_ORDER);
      setTimeout(() => this.recalcHeight(), 100);
    } else {
      localStorage.setItem(MessageLibrary.SELECTED_ROW_ORDER, value.toString());
      this.itemsPerPageChange.emit(value);
    }
  }

  triggerMeasurement(): void {
    this.isMeasureTable = true;
  }
}
