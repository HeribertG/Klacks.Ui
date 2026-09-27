// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dialog asking for the start of a TimeRange shift before it is booked: the shift only defines a permitted
 * window and an engagement duration, so booking the window itself would bill its full length. Start and
 * duration are editable (proposed: window start and the shift's duration); the end is always derived as
 * start plus duration. Saving is only possible for a positive duration whose span lies inside the window.
 * open() resolves with the placement to book, or null when the user cancels - then nothing is booked.
 * @param options.shiftName - Name of the shift, shown in the window hint
 * @param options.windowStart - The shift's StartShift, lower window bound
 * @param options.windowEnd - The shift's EndShift, upper window bound
 * @param options.workTime - The shift's engagement duration in hours
 */
import { ChangeDetectionStrategy, Component, inject, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { formatTime, formatTimeFromMinutes } from 'src/app/shared/helpers/time-format.helper';
import {
  defaultTimeRangePlacement,
  ITimeRangePlacement,
  resolveTimeRangePlacement,
  timeRangeWindowMinutes,
} from 'src/app/shared/helpers/time-range-placement.helper';

export interface IOpenTimeRangeWorkOptions {
  shiftName: string;
  windowStart: string;
  windowEnd: string;
  workTime: number;
}

const OUTSIDE_WINDOW_ERROR_KEY = 'dialog.timeRangeWork.error.outsideWindow';
const INVALID_DURATION_ERROR_KEY = 'dialog.workEdit.error.invalidTime';
const MINUTES_PER_HOUR = 60;

@Component({
  selector: 'app-time-range-work-dialog',
  templateUrl: './time-range-work-dialog.component.html',
  styleUrls: ['./time-range-work-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, TimeInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeRangeWorkDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('timeRangeWorkModal');

  private ngbModal = inject(NgbModal);

  shiftName = '';
  windowStart = '';
  windowEnd = '';
  workTimeHours = 0;
  startTime: OwnTime = OwnTime.forTime('00', '00');
  endTime: OwnTime = OwnTime.forTime('00', '00');
  duration: OwnTime = OwnTime.forDuration('00', '00');
  errorKey: string | undefined;

  private placement: ITimeRangePlacement | null = null;
  private modalRef: NgbModalRef | null = null;
  private resolveResult: ((placement: ITimeRangePlacement | null) => void) | null = null;

  get windowStartLabel(): string {
    return formatTime(this.windowStart);
  }

  get windowEndLabel(): string {
    return formatTime(this.windowEnd);
  }

  open(options: IOpenTimeRangeWorkOptions): Promise<ITimeRangePlacement | null> {
    this.shiftName = options.shiftName;
    this.windowStart = options.windowStart;
    this.windowEnd = options.windowEnd;
    this.workTimeHours = options.workTime;

    const proposal = defaultTimeRangePlacement(options.windowStart, options.windowEnd, options.workTime);
    const proposedMinutes = Math.round(proposal.workTime * MINUTES_PER_HOUR);
    this.duration = OwnTime.forDuration(
      Math.floor(proposedMinutes / MINUTES_PER_HOUR).toString().padStart(2, '0'),
      (proposedMinutes % MINUTES_PER_HOUR).toString().padStart(2, '0'),
    );
    this.startTime = this.parseTimeString(proposal.startTime);
    this.recalculate();

    const result = new Promise<ITimeRangePlacement | null>((resolve) => {
      this.resolveResult = resolve;
    });

    this.modalRef = this.ngbModal.open(this.modalTemplate(), { centered: true, backdrop: 'static' });
    this.modalRef.result?.catch(() => this.finish(null));

    return result;
  }

  onTimeChange(): void {
    this.recalculate();
  }

  isValid(): boolean {
    return this.placement !== null;
  }

  onSave(): void {
    if (!this.placement) return;
    const placement = this.placement;
    this.finish(placement);
    this.modalRef?.close();
  }

  onCancel(): void {
    this.finish(null);
    this.modalRef?.dismiss();
  }

  private finish(placement: ITimeRangePlacement | null): void {
    const resolve = this.resolveResult;
    this.resolveResult = null;
    resolve?.(placement);
  }

  private recalculate(): void {
    const startMinutes = this.startTime.toMinutes();
    const durationMinutes = this.duration.toMinutes();
    this.endTime = this.parseTimeString(formatTimeFromMinutes(startMinutes + durationMinutes));

    if (durationMinutes <= 0 || durationMinutes > timeRangeWindowMinutes(this.windowStart, this.windowEnd)) {
      this.placement = null;
      this.errorKey = durationMinutes <= 0 ? INVALID_DURATION_ERROR_KEY : OUTSIDE_WINDOW_ERROR_KEY;
      return;
    }

    this.placement = resolveTimeRangePlacement(
      this.windowStart,
      this.windowEnd,
      startMinutes,
      this.endTime.toMinutes(),
    );
    this.errorKey = this.placement ? undefined : OUTSIDE_WINDOW_ERROR_KEY;
  }

  private parseTimeString(time: string): OwnTime {
    const parts = time.split(':');
    return parts.length >= 2 ? OwnTime.forTime(parts[0], parts[1]) : OwnTime.forTime('00', '00');
  }
}
