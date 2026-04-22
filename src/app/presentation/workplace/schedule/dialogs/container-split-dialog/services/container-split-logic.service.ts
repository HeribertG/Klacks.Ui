// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure split logic for container works: time validation, item categorization, absence splitting.
 */
import { Injectable } from '@angular/core';
import {
  ContainerWorkChildren,
  SubBreakResource,
  SubWorkResource,
} from 'src/app/infrastructure/api/schedule/data-container-work-children.service';

export interface SubWorkConflict {
  subWork: SubWorkResource;
  resolution: 'before' | 'after' | null;
}

export interface CategorizationResult {
  beforeWorks: SubWorkResource[];
  afterWorks: SubWorkResource[];
  conflicts: SubWorkConflict[];
  beforeBreaks: SubBreakResource[];
  afterBreaks: SubBreakResource[];
}

@Injectable()
export class ContainerSplitLogicService {
  isSplitTimeValid(splitTime: string, containerStart: string, containerEnd: string): boolean {
    const split = this.toMinutes(splitTime);
    return split > this.toMinutes(containerStart) && split < this.toMinutes(containerEnd);
  }

  categorizeItems(children: ContainerWorkChildren, splitTime: string): CategorizationResult {
    const split = this.toMinutes(splitTime);
    const beforeWorks: SubWorkResource[] = [];
    const afterWorks: SubWorkResource[] = [];
    const conflicts: SubWorkConflict[] = [];

    for (const sw of children.subWorks) {
      const end = this.toMinutes(sw.endTime);
      const start = this.toMinutes(sw.startTime);
      if (end <= split) {
        beforeWorks.push(sw);
      } else if (start >= split) {
        afterWorks.push(sw);
      } else {
        conflicts.push({ subWork: sw, resolution: null });
      }
    }

    const beforeBreaks: SubBreakResource[] = [];
    const afterBreaks: SubBreakResource[] = [];

    for (const sb of children.subBreaks) {
      const end = this.toMinutes(sb.endTime);
      const start = this.toMinutes(sb.startTime);
      if (end <= split) {
        beforeBreaks.push(sb);
      } else if (start >= split) {
        afterBreaks.push(sb);
      } else {
        beforeBreaks.push({ ...sb, endTime: splitTime });
        afterBreaks.push({ ...sb, id: '', startTime: splitTime });
      }
    }

    return { beforeWorks, afterWorks, conflicts, beforeBreaks, afterBreaks };
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}
