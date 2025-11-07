import { Injectable } from '@angular/core';
import { Observable, fromEvent, merge } from 'rxjs';
import { debounceTime, startWith, map } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { isNumeric } from 'src/app/shared/helpers/number.helper';

@Injectable()
export abstract class BaseTableResizeService {
  protected readonly UI_OFFSET = 234;

  protected abstract getMinItemsPerPage(): number;
  protected abstract getDefaultRowHeight(): number;
  protected abstract getMinRowHeight(): number;
  protected abstract getRowsPerDataItem(): number;
  protected abstract getStorageKey(): string;
  protected abstract measureAverageRowHeight(tableElement: HTMLElement): number;

  protected defaultRowHeight: number;
  protected minRowHeight: number;

  constructor(protected localStorageService: LocalStorageService) {
    this.defaultRowHeight = this.getDefaultRowHeight();
    this.minRowHeight = this.getMinRowHeight();
  }

  setRowHeights(defaultHeight: number, minHeight: number): void {
    this.defaultRowHeight = defaultHeight;
    this.minRowHeight = minHeight;
  }

  calculateOptimalRowCount(
    tableElement: HTMLElement,
    maxItems?: number
  ): number {
    const availableHeight = this.calculateAvailableHeight(tableElement);
    const rowHeight = this.getConsistentRowHeight(tableElement);

    if (!rowHeight || rowHeight < this.minRowHeight) {
      return this.getMinItemsPerPage();
    }

    let optimalCount = Math.floor(availableHeight / rowHeight);

    if (maxItems !== undefined) {
      optimalCount = Math.min(optimalCount, maxItems);
    }

    return Math.max(this.getMinItemsPerPage(), optimalCount);
  }

  calculateAvailableHeight(tableElement: HTMLElement): number {
    const windowHeight = window.innerHeight;
    const tableRect = tableElement.getBoundingClientRect();
    const tableTop = tableRect.top;
    const availableHeight = windowHeight - tableTop - this.UI_OFFSET;

    return Math.max(0, availableHeight);
  }

  isAutoMode(rowSize?: number | null): boolean {
    const saved = rowSize ?? this.getSavedRowSize();
    return saved === -1 || saved === null;
  }

  createWindowResizeObservable(): Observable<Event> {
    return fromEvent(window, 'resize').pipe(
      debounceTime(200),
      startWith({} as Event)
    );
  }

  createTableResizeObservable(
    tableElement: HTMLElement
  ): Observable<ResizeObserverEntry[]> {
    return new Observable<ResizeObserverEntry[]>((subscriber) => {
      const resizeObserver = new ResizeObserver((entries) => {
        subscriber.next(entries);
      });

      resizeObserver.observe(tableElement);

      return () => {
        resizeObserver.disconnect();
      };
    }).pipe(debounceTime(200));
  }

  createResizeObservable(
    tableElement: HTMLElement,
    maxItems?: number
  ): Observable<number> {
    const windowResize$ = this.createWindowResizeObservable();
    const tableResize$ = this.createTableResizeObservable(tableElement);

    return merge(windowResize$, tableResize$).pipe(
      startWith(null),
      map(() => this.calculateOptimalRowCount(tableElement, maxItems)),
      debounceTime(50)
    );
  }

  getSavedRowSize(): number | null {
    const saved = this.localStorageService.get(this.getStorageKey());
    if (saved && isNumeric(saved)) {
      return +saved;
    }
    return null;
  }

  saveRowSize(value: number): void {
    this.localStorageService.set(this.getStorageKey(), value.toString());
  }

  getEffectiveRowSize(tableElement: HTMLElement, maxItems?: number): number {
    const savedRowSize = this.getSavedRowSize();

    if (this.isAutoMode(savedRowSize)) {
      return this.calculateOptimalRowCount(tableElement, maxItems);
    }

    return savedRowSize ?? this.getMinItemsPerPage();
  }

  protected getConsistentRowHeight(tableElement: HTMLElement): number {
    const measuredHeight = this.measureAverageRowHeight(tableElement);

    if (measuredHeight > 0) {
      return measuredHeight;
    }

    return this.defaultRowHeight;
  }
}
