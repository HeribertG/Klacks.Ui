// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Modal dialog component for editing the children of a container work entry.
 * @param workId - The ID of the parent container work entry to load and save children for
 * @param shiftId - The shift ID associated with the container work
 * @param currentDate - The date context for the container work entry
 * @param availableShifts - List of shifts that can be added as sub-works
 */

import { ChangeDetectionStrategy, Component, inject, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ContainerWorkChildrenService, SubWorkResource } from 'src/app/domain/services/schedule/container-work-children.service';
import { ContainerWorkEditStateService } from './services/container-work-edit-state.service';

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
  imports: [CommonModule, TranslateModule],
  providers: [ContainerWorkEditStateService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContainerWorkEditDialogComponent {
  @ViewChild('containerWorkEditModal') modalTemplate!: TemplateRef<unknown>;

  private ngbModal = inject(NgbModal);
  private childrenService = inject(ContainerWorkChildrenService);
  protected stateService = inject(ContainerWorkEditStateService);
  protected translate = inject(TranslateService);

  protected workId = '';
  protected shiftId = '';
  protected currentDate: Date | null = null;
  protected availableShifts: AvailableShift[] = [];
  protected isLoading = false;

  private modalRef: NgbModalRef | null = null;

  open(workId: string, shiftId: string, currentDate: Date, availableShifts: AvailableShift[]): void {
    this.workId = workId;
    this.shiftId = shiftId;
    this.currentDate = currentDate;
    this.availableShifts = availableShifts;
    this.isLoading = true;

    this.childrenService.loadChildren(workId).subscribe({
      next: (children) => {
        this.stateService.initialize(children);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate, {
      centered: true,
      backdrop: 'static',
      size: 'xl',
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

  protected formatTime(time: string | null | undefined): string {
    if (!time) return '';
    return time.substring(0, 5);
  }
}
