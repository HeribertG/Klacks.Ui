// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog component for editing the children of a container work entry.
 * @param workId - The ID of the parent container work entry to load and save children for
 * @param shiftId - The shift ID associated with the container work
 * @param currentDate - The date context for the container work entry
 * @param availableShifts - List of shifts that can be added as sub-works
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, effect, inject, Injector, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ContainerWorkChildrenService, SubWorkResource, SubBreakResource } from 'src/app/domain/services/schedule/container-work-children.service';
import { ContainerWorkEditStateService } from './services/container-work-edit-state.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-class';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeRulerComponent, IShiftContextMenuEvent } from 'src/app/presentation/shared/time-ruler/time-ruler.component';

export interface AvailableShift {
  id: string;
  name: string;
  abbreviation: string;
  startShift: string;
  endShift: string;
  workTime: number;
  clientId: string;
}

@Component({
  selector: 'app-container-work-edit-dialog',
  templateUrl: './container-work-edit-dialog.component.html',
  styleUrls: ['./container-work-edit-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, TimeRulerComponent],
  providers: [ContainerWorkEditStateService, ContainerTemplateShiftService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerWorkEditDialogComponent {
  @ViewChild('containerWorkEditModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private cdr = inject(ChangeDetectorRef);
  private childrenService = inject(ContainerWorkChildrenService);
  private containerShiftService = inject(ContainerTemplateShiftService);
  private injector = inject(Injector);
  protected stateService = inject(ContainerWorkEditStateService);
  protected translate = inject(TranslateService);

  protected workId = '';
  protected shiftId = '';
  protected currentDate: Date | null = null;
  protected availableShifts: AvailableShift[] = [];
  protected isLoading = false;
  protected timeRulerReady = false;
  protected timeFrom: OwnTime = OwnTime.forTime('06', '00');
  protected timeTo: OwnTime = OwnTime.forTime('22', '00');

  private modalRef: NgbModalRef | null = null;
  private syncEffectRef: ReturnType<typeof effect> | null = null;

  open(workId: string, shiftId: string, currentDate: Date, availableShifts: AvailableShift[]): void {
    this.workId = workId;
    this.shiftId = shiftId;
    this.currentDate = currentDate;
    this.availableShifts = availableShifts;
    this.isLoading = true;
    this.timeRulerReady = false;

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'xl',
    });

    this.childrenService.loadChildren(workId).subscribe({
      next: (children) => {
        this.stateService.initialize(children);
        this.isLoading = false;
        setTimeout(() => {
          this.startSyncEffect();
          this.timeRulerReady = true;
          this.cdr.markForCheck();
        }, 100);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  protected onAddShift(shift: AvailableShift): void {
    if (!this.currentDate) return;

    const newSubWork: SubWorkResource = {
      id: crypto.randomUUID(),
      shiftId: shift.id,
      clientId: shift.clientId,
      currentDate: this.currentDate.toISOString().split('T')[0],
      startTime: shift.startShift,
      endTime: shift.endShift,
      workTime: shift.workTime,
      parentWorkId: this.workId,
      information: null,
    };

    this.stateService.addSubWork(newSubWork);
  }

  protected onRemoveSubWork(workId: string): void {
    this.stateService.removeSubWork(workId);
  }

  protected onRemoveSubBreak(breakId: string): void {
    this.stateService.removeSubBreak(breakId);
  }

  protected onSave(modal: NgbModalRef): void {
    const children = this.stateService.getCurrentState();
    this.childrenService.saveChildren(this.workId, children).subscribe({
      next: (saved) => {
        this.stateService.initialize(saved);
        modal.close();
      },
      error: () => {
      },
    });
  }

  protected onCancel(modal: NgbModalRef): void {
    if (this.stateService.isDirty()) {
      const confirmed = confirm(this.translate.instant('dialog.containerWorkEdit.confirmCancel'));
      if (!confirmed) return;
    }
    this.stateService.reset();
    modal.dismiss();
  }

  protected onShiftRightClick(_event: IShiftContextMenuEvent): void {
    if (_event.item) {
      this.containerShiftService.setSelectedShift(_event.item);
    }
  }

  protected onItemsDisplaced(): void {
    const items = this.containerShiftService.selectedContainerTemplateItemsSignal();
    const updatedWorks = this.stateService.subWorks().map(w => {
      const item = items.find(i => i.id === w.id);
      if (!item) return w;
      return {
        ...w,
        startTime: (item.timeRangeStartItem || item.startItem || w.startTime).substring(0, 8),
        endTime: (item.timeRangeEndItem || item.endItem || w.endTime).substring(0, 8),
      };
    });

    const updatedBreaks = this.stateService.subBreaks().map(b => {
      const item = items.find(i => i.id === b.id);
      if (!item) return b;
      return {
        ...b,
        startTime: (item.startItem || b.startTime).substring(0, 8),
        endTime: (item.endItem || b.endTime).substring(0, 8),
      };
    });

    this.stateService.subWorks.set(updatedWorks);
    this.stateService.subBreaks.set(updatedBreaks);
    this.stateService.isDirty.set(true);
  }

  protected formatTime(time: string | null | undefined): string {
    if (!time) return '';
    return time.substring(0, 5);
  }

  private subWorkToContainerItem(work: SubWorkResource): IContainerTemplateItem {
    const start = work.startTime.substring(0, 5);
    const end = work.endTime.substring(0, 5);
    return {
      id: work.id,
      shiftId: work.shiftId,
      startItem: start,
      endItem: end,
      timeRangeStartItem: start,
      timeRangeEndItem: end,
      briefingTime: '00:00',
      debriefingTime: '00:00',
      travelTimeBefore: '00:00',
      travelTimeAfter: '00:00',
    };
  }

  private subBreakToContainerItem(breakItem: SubBreakResource): IContainerTemplateItem {
    const start = breakItem.startTime.substring(0, 5);
    const end = breakItem.endTime.substring(0, 5);
    return {
      id: breakItem.id,
      absenceId: breakItem.absenceId,
      startItem: start,
      endItem: end,
      timeRangeStartItem: '00:00',
      timeRangeEndItem: '00:00',
      briefingTime: '00:00',
      debriefingTime: '00:00',
      travelTimeBefore: '00:00',
      travelTimeAfter: '00:00',
    };
  }

  private updateTimeRange(works: SubWorkResource[], breaks: SubBreakResource[]): void {
    const allTimes = [
      ...works.map(w => ({ start: w.startTime, end: w.endTime })),
      ...breaks.map(b => ({ start: b.startTime, end: b.endTime })),
    ];

    if (allTimes.length === 0) {
      this.timeFrom = OwnTime.forTime('06', '00');
      this.timeTo = OwnTime.forTime('22', '00');
      return;
    }

    let minMinutes = 24 * 60;
    let maxMinutes = 0;

    for (const t of allTimes) {
      const startParts = t.start.split(':');
      const endParts = t.end.split(':');
      const startMins = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMins = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      if (startMins < minMinutes) minMinutes = startMins;
      if (endMins > maxMinutes) maxMinutes = endMins;
    }

    const paddedStart = Math.max(0, minMinutes - 60);
    const paddedEnd = Math.min(24 * 60, maxMinutes + 60);

    const fromHours = Math.floor(paddedStart / 60).toString().padStart(2, '0');
    const fromMins = (paddedStart % 60).toString().padStart(2, '0');
    const toHours = Math.floor(paddedEnd / 60).toString().padStart(2, '0');
    const toMins = (paddedEnd % 60).toString().padStart(2, '0');

    this.timeFrom = OwnTime.forTime(fromHours, fromMins);
    this.timeTo = OwnTime.forTime(toHours, toMins);
  }

  private startSyncEffect(): void {
    if (this.syncEffectRef) return;
    this.syncEffectRef = effect(() => {
      const works = this.stateService.subWorks();
      const breaks = this.stateService.subBreaks();
      const items = [
        ...works.map(w => this.subWorkToContainerItem(w)),
        ...breaks.map(b => this.subBreakToContainerItem(b)),
      ];
      this.containerShiftService.setSelectedContainerTemplateItems(items);
      this.updateTimeRange(works, breaks);
    }, { injector: this.injector, allowSignalWrites: true });
  }
}
