// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure split logic for container works: a container may only be split between two consecutive items
 * (tasks or absences), never through one, and both halves must keep at least one task.
 * @param containerStart - Container start (HH:MM); all times are compared relative to it so containers crossing midnight work
 * @param splitTime - Chosen split time (HH:MM)
 */
import { Injectable } from '@angular/core';
import {
  ContainerWorkChildren,
  SubBreakResource,
  SubWorkResource,
  WorkChangeResource,
} from 'src/app/infrastructure/api/schedule/data-container-work-children.service';

export interface SplitGap {
  start: string;
  end: string;
  beforeLabel: string | null;
  afterLabel: string | null;
}

export interface CategorizationResult {
  beforeWorks: SubWorkResource[];
  afterWorks: SubWorkResource[];
  beforeBreaks: SubBreakResource[];
  afterBreaks: SubBreakResource[];
  beforeWorkChanges: WorkChangeResource[];
  afterWorkChanges: WorkChangeResource[];
}

interface TimelineItem {
  start: number;
  end: number;
  isTask: boolean;
  label: string | null;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const TIME_PART_LENGTH = 2;
const TIME_PAD_CHAR = '0';
const TIME_SEPARATOR = ':';

@Injectable()
export class ContainerSplitLogicService {
  computeSplitGaps(
    children: ContainerWorkChildren,
    containerStart: string,
    containerEnd: string,
  ): SplitGap[] {
    const origin = this.toMinutes(containerStart);
    const containerLength = this.spanLength(origin, this.toMinutes(containerEnd)) || MINUTES_PER_DAY;
    const items = this.buildTimeline(children, origin);
    const totalTasks = items.filter((item) => item.isTask).length;
    const gaps: SplitGap[] = [];

    let coveredUntil = Number.NEGATIVE_INFINITY;
    let lastLabelBefore: string | null = null;
    let tasksBefore = 0;

    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i];
      if (current.end >= coveredUntil) {
        lastLabelBefore = current.label;
      }
      coveredUntil = Math.max(coveredUntil, current.end);
      if (current.isTask) tasksBefore++;

      const next = items[i + 1];
      const hasTasksOnBothSides = tasksBefore > 0 && totalTasks - tasksBefore > 0;
      const isInsideContainer = coveredUntil > 0 && next.start < containerLength;
      if (coveredUntil <= next.start && hasTasksOnBothSides && isInsideContainer) {
        gaps.push({
          start: this.fromRelative(coveredUntil, origin),
          end: this.fromRelative(next.start, origin),
          beforeLabel: lastLabelBefore,
          afterLabel: next.label,
        });
      }
    }

    return gaps;
  }

  isSplitTimeValid(splitTime: string, gaps: SplitGap[], containerStart: string): boolean {
    if (!splitTime) return false;
    const origin = this.toMinutes(containerStart);
    const split = this.toRelative(splitTime, origin);
    return gaps.some(
      (gap) => split >= this.toRelative(gap.start, origin) && split <= this.toRelative(gap.end, origin),
    );
  }

  categorizeItems(
    children: ContainerWorkChildren,
    splitTime: string,
    containerStart: string,
  ): CategorizationResult {
    const origin = this.toMinutes(containerStart);
    const split = this.toRelative(splitTime, origin);
    const endsBeforeSplit = (item: { startTime: string; endTime: string }) =>
      this.relativeEnd(item.startTime, item.endTime, origin) <= split;

    const beforeWorks = children.subWorks.filter(endsBeforeSplit);
    const afterWorks = children.subWorks.filter((w) => !endsBeforeSplit(w));
    const beforeWorkIds = new Set(beforeWorks.map((w) => w.id));
    const afterWorkIds = new Set(afterWorks.map((w) => w.id));

    return {
      beforeWorks,
      afterWorks,
      beforeBreaks: children.subBreaks.filter(endsBeforeSplit),
      afterBreaks: children.subBreaks.filter((b) => !endsBeforeSplit(b)),
      beforeWorkChanges: children.subWorkChanges.filter((wc) => beforeWorkIds.has(wc.workId)),
      afterWorkChanges: children.subWorkChanges.filter((wc) => afterWorkIds.has(wc.workId)),
    };
  }

  toTimeParts(time: string): { hours: string; minutes: string } {
    const [hours, minutes] = time.split(TIME_SEPARATOR);
    return { hours, minutes };
  }

  private buildTimeline(children: ContainerWorkChildren, origin: number): TimelineItem[] {
    const tasks = children.subWorks.map((w) => ({
      start: this.toRelative(w.startTime, origin),
      end: this.relativeEnd(w.startTime, w.endTime, origin),
      isTask: true,
      label: w.shift?.abbreviation ?? null,
    }));
    const absences = children.subBreaks.map((b) => ({
      start: this.toRelative(b.startTime, origin),
      end: this.relativeEnd(b.startTime, b.endTime, origin),
      isTask: false,
      label: null,
    }));
    return [...tasks, ...absences].sort((a, b) => a.start - b.start || a.end - b.end);
  }

  private relativeEnd(startTime: string, endTime: string, origin: number): number {
    const start = this.toRelative(startTime, origin);
    return start + this.spanLength(this.toMinutes(startTime), this.toMinutes(endTime));
  }

  private spanLength(start: number, end: number): number {
    return (end - start + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  }

  private toRelative(time: string, origin: number): number {
    return this.spanLength(origin, this.toMinutes(time));
  }

  private fromRelative(relative: number, origin: number): string {
    const absolute = (relative + origin) % MINUTES_PER_DAY;
    const hours = Math.floor(absolute / MINUTES_PER_HOUR);
    const minutes = absolute % MINUTES_PER_HOUR;
    return `${this.pad(hours)}${TIME_SEPARATOR}${this.pad(minutes)}`;
  }

  private pad(value: number): string {
    return value.toString().padStart(TIME_PART_LENGTH, TIME_PAD_CHAR);
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(TIME_SEPARATOR).map(Number);
    return h * MINUTES_PER_HOUR + m;
  }
}
