// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Per-dialog state service for the container work edit dialog, managing in-memory sub-works and sub-breaks with dirty tracking.
 * @param subWorks - Signal holding the current list of sub-work entries
 * @param subBreaks - Signal holding the current list of sub-break entries
 * @param isDirty - Signal indicating whether the state has been modified since initialization
 */

import { Injectable, signal } from '@angular/core';
import { ContainerWorkChildren, SubWorkResource, SubBreakResource } from 'src/app/domain/services/schedule/container-work-children.service';

@Injectable()
export class ContainerWorkEditStateService {
  readonly subWorks = signal<SubWorkResource[]>([]);
  readonly subBreaks = signal<SubBreakResource[]>([]);
  readonly isDirty = signal(false);

  private originalSubWorks: SubWorkResource[] = [];
  private originalSubBreaks: SubBreakResource[] = [];

  initialize(children: ContainerWorkChildren): void {
    this.originalSubWorks = [...children.subWorks];
    this.originalSubBreaks = [...children.subBreaks];
    this.subWorks.set([...children.subWorks]);
    this.subBreaks.set([...children.subBreaks]);
    this.isDirty.set(false);
  }

  addSubWork(work: SubWorkResource): void {
    this.subWorks.update(works => [...works, work]);
    this.isDirty.set(true);
  }

  removeSubWork(workId: string): void {
    this.subWorks.update(works => works.filter(w => w.id !== workId));
    this.isDirty.set(true);
  }

  updateSubWorkTimes(workId: string, startTime: string, endTime: string): void {
    this.subWorks.update(works =>
      works.map(w => w.id === workId ? { ...w, startTime, endTime } : w)
    );
    this.isDirty.set(true);
  }

  addSubBreak(breakItem: SubBreakResource): void {
    this.subBreaks.update(breaks => [...breaks, breakItem]);
    this.isDirty.set(true);
  }

  removeSubBreak(breakId: string): void {
    this.subBreaks.update(breaks => breaks.filter(b => b.id !== breakId));
    this.isDirty.set(true);
  }

  reset(): void {
    this.subWorks.set([...this.originalSubWorks]);
    this.subBreaks.set([...this.originalSubBreaks]);
    this.isDirty.set(false);
  }

  getCurrentState(): ContainerWorkChildren {
    return {
      subWorks: this.subWorks(),
      subBreaks: this.subBreaks(),
    };
  }
}
