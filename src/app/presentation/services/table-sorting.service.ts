// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, computed, signal } from '@angular/core';
import {
  HeaderDirection,
  HeaderProperties,
} from 'src/app/domain/models/headerProperties';

export interface TableSortingConfig {
  columns: string[];
  defaultOrderBy: string;
  defaultSortOrder: 'asc' | 'desc';
  useThreeWaySort?: boolean;
}

export interface SortState {
  orderBy: string;
  sortOrder: 'asc' | 'desc' | '';
}

@Injectable()
export class TableSortingService {
  private headers = new Map<string, HeaderProperties>();
  private config: TableSortingConfig | null = null;

  private readonly ARROW_DOWN = '↓';
  private readonly ARROW_UP = '↑';
  private readonly ARROW_NONE = '';

  public currentSort = signal<SortState>({
    orderBy: '',
    sortOrder: 'asc',
  });

  public arrows = computed(() => {
    const arrowMap = new Map<string, string>();
    this.headers.forEach((header, key) => {
      arrowMap.set(key, this.getArrowForDirection(header.order));
    });
    return arrowMap;
  });

  initialize(config: TableSortingConfig): void {
    this.config = config;
    this.headers.clear();

    config.columns.forEach((column) => {
      this.headers.set(column, new HeaderProperties());
    });

    this.currentSort.set({
      orderBy: config.defaultOrderBy,
      sortOrder: config.defaultSortOrder,
    });

    this.applySortState(config.defaultOrderBy, config.defaultSortOrder);
  }

  onHeaderClick(columnKey: string, callback: () => void): void {
    const header = this.headers.get(columnKey);
    if (!header) {
      return;
    }

    if (this.config?.useThreeWaySort) {
      header.DirectionSwitch();
    } else {
      header.DirectionSwitchSimple();
    }

    const sortOrder = this.determineSortOrder(header);

    this.resetAllHeadersExcept(columnKey);
    this.setHeaderDirection(columnKey, sortOrder);

    this.currentSort.set({
      orderBy: columnKey,
      sortOrder: sortOrder,
    });

    callback();
  }

  getArrow(columnKey: string): string {
    const header = this.headers.get(columnKey);
    if (!header) return this.ARROW_NONE;
    return this.getArrowForDirection(header.order);
  }

  getCurrentOrderBy(): string {
    return this.currentSort().orderBy;
  }

  getCurrentSortOrder(): 'asc' | 'desc' | '' {
    return this.currentSort().sortOrder;
  }

  private determineSortOrder(header: HeaderProperties): 'asc' | 'desc' | '' {
    if (header.order === HeaderDirection.Down) return 'asc';
    if (header.order === HeaderDirection.Up) return 'desc';
    return '';
  }

  private resetAllHeadersExcept(exceptColumn: string): void {
    this.headers.forEach((header, key) => {
      if (key !== exceptColumn) {
        header.order = HeaderDirection.None;
      }
    });
  }

  private setHeaderDirection(
    columnKey: string,
    sortOrder: 'asc' | 'desc' | ''
  ): void {
    const header = this.headers.get(columnKey);
    if (!header) return;

    if (sortOrder === 'asc') {
      header.order = HeaderDirection.Down;
    } else if (sortOrder === 'desc') {
      header.order = HeaderDirection.Up;
    } else {
      header.order = HeaderDirection.None;
    }
  }

  private applySortState(
    orderBy: string,
    sortOrder: 'asc' | 'desc' | ''
  ): void {
    this.resetAllHeadersExcept(orderBy);
    this.setHeaderDirection(orderBy, sortOrder);
  }

  private getArrowForDirection(direction: HeaderDirection): string {
    switch (direction) {
      case HeaderDirection.Down:
        return this.ARROW_DOWN;
      case HeaderDirection.Up:
        return this.ARROW_UP;
      case HeaderDirection.None:
        return this.ARROW_NONE;
      default:
        return this.ARROW_NONE;
    }
  }

  restoreSortState(orderBy: string, sortOrder: 'asc' | 'desc' | ''): void {
    this.currentSort.set({ orderBy, sortOrder });
    this.applySortState(orderBy, sortOrder);
  }
}
