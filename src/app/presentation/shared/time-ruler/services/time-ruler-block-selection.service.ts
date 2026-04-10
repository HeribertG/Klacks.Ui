// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Manages multi-selection of time ruler items as a unified block.
 * Supports Ctrl+Click (toggle), Shift+Click (range select), and single-click (replace).
 * @param selectedItems - Set of currently selected container template items
 * @param lastClickedItem - Last clicked item for Shift+Click range selection anchor
 */

import { Injectable, signal, WritableSignal } from '@angular/core';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { Rectangle } from 'src/app/shared/helpers/geometry.helper';
import { TimeRangeService } from './time-range.service';

const BLOCK_BOUNDS_HORIZONTAL_EXTENSION_PX = 2;

@Injectable()
export class TimeRulerBlockSelectionService {
  readonly selectedItems: WritableSignal<Set<IContainerTemplateItem>> = signal(new Set());

  private lastClickedItem: IContainerTemplateItem | null = null;

  constructor(private readonly timeRangeService: TimeRangeService) {}

  toggleItem(
    item: IContainerTemplateItem,
    ctrlKey: boolean,
    shiftKey: boolean,
    allItems: IContainerTemplateItem[]
  ): void {
    if (ctrlKey) {
      this.handleCtrlClick(item);
    } else if (shiftKey) {
      this.handleShiftClick(item, allItems);
    } else {
      this.handleSingleClick(item);
    }

    this.lastClickedItem = item;
  }

  clearSelection(): void {
    this.selectedItems.set(new Set());
    this.lastClickedItem = null;
  }

  isSelected(item: IContainerTemplateItem): boolean {
    return this.selectedItems().has(item);
  }

  hasBlock(): boolean {
    return this.selectedItems().size > 0;
  }

  isDraggable(): boolean {
    const items = this.selectedItems();
    if (items.size === 0) return false;

    for (const item of items) {
      const hasTimeRange = !!item.shift?.isTimeRange;
      const hasAbsence = !!item.absenceId;
      if (!hasTimeRange && !hasAbsence) return false;
    }

    return true;
  }

  getSelectedSingle(): IContainerTemplateItem | null {
    const items = this.selectedItems();
    if (items.size !== 1) return null;
    return items.values().next().value ?? null;
  }

  calculateBlockBounds(
    marginLeftRight: number,
    boxWidth: number,
    range: any,
    height: number
  ): Rectangle | null {
    const items = this.selectedItems();
    if (items.size === 0) return null;

    let minY = Infinity;
    let maxY = -Infinity;

    for (const item of items) {
      const effectiveStart = this.timeRangeService.getEffectiveStartMinutes(item);
      const effectiveEnd = this.timeRangeService.getEffectiveEndMinutes(item);

      if (effectiveStart === 0 && effectiveEnd === 0) continue;

      const startY =
        ((effectiveStart - range.displayFromMinutes) / range.totalMinutes) * height;
      const endY =
        ((effectiveEnd - range.displayFromMinutes) / range.totalMinutes) * height;

      minY = Math.min(minY, startY);
      maxY = Math.max(maxY, endY);
    }

    if (minY === Infinity || maxY === -Infinity) return null;

    return new Rectangle(
      marginLeftRight - BLOCK_BOUNDS_HORIZONTAL_EXTENSION_PX,
      minY,
      marginLeftRight + boxWidth + BLOCK_BOUNDS_HORIZONTAL_EXTENSION_PX,
      maxY
    );
  }

  getBlockEffectiveBounds(): { effectiveStart: number; effectiveEnd: number } | null {
    const items = this.selectedItems();
    if (items.size === 0) return null;

    let minStart = Infinity;
    let maxEnd = -Infinity;

    for (const item of items) {
      const effectiveStart = this.timeRangeService.getEffectiveStartMinutes(item);
      const effectiveEnd = this.timeRangeService.getEffectiveEndMinutes(item);

      minStart = Math.min(minStart, effectiveStart);
      maxEnd = Math.max(maxEnd, effectiveEnd);
    }

    if (minStart === Infinity || maxEnd === -Infinity) return null;

    return { effectiveStart: minStart, effectiveEnd: maxEnd };
  }

  private handleCtrlClick(item: IContainerTemplateItem): void {
    const current = new Set(this.selectedItems());
    if (current.has(item)) {
      current.delete(item);
    } else {
      current.add(item);
    }
    this.selectedItems.set(current);
  }

  private handleShiftClick(
    item: IContainerTemplateItem,
    allItems: IContainerTemplateItem[]
  ): void {
    if (!this.lastClickedItem) {
      this.handleSingleClick(item);
      return;
    }

    const sorted = [...allItems].sort(
      (a, b) =>
        this.timeRangeService.getShiftStartMinutes(a) -
        this.timeRangeService.getShiftStartMinutes(b)
    );

    const anchorIndex = sorted.indexOf(this.lastClickedItem);
    const targetIndex = sorted.indexOf(item);

    if (anchorIndex === -1 || targetIndex === -1) {
      this.handleSingleClick(item);
      return;
    }

    const from = Math.min(anchorIndex, targetIndex);
    const to = Math.max(anchorIndex, targetIndex);

    const newSelection = new Set<IContainerTemplateItem>();
    for (let i = from; i <= to; i++) {
      newSelection.add(sorted[i]);
    }

    this.selectedItems.set(newSelection);
  }

  private handleSingleClick(item: IContainerTemplateItem): void {
    this.selectedItems.set(new Set([item]));
  }
}
