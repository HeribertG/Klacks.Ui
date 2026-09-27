// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { OwnTime } from 'src/app/domain/models/schedule/schedule-class';
import { TimeRangeWorkDialogComponent } from './time-range-work-dialog.component';

describe('TimeRangeWorkDialogComponent', () => {
  let component: TimeRangeWorkDialogComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeRangeWorkDialogComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: NgbModal,
          useValue: { open: vi.fn().mockReturnValue({ close: vi.fn(), dismiss: vi.fn() }) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TimeRangeWorkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function openBereitschaft(): Promise<unknown> {
    return component.open({ shiftName: 'Bereitschaft', windowStart: '00:00:00', windowEnd: '00:00:00', workTime: 8 });
  }

  it('proposes the work time at the window start instead of the whole window', () => {
    void openBereitschaft();

    expect(component.startTime.toMinutes()).toBe(0);
    expect(component.endTime.toMinutes()).toBe(8 * 60);
    expect(component.isValid()).toBe(true);
  });

  it('derives the end from the chosen start plus the proposed shift duration', () => {
    void openBereitschaft();
    component.startTime = OwnTime.forTime('09', '30');
    component.onTimeChange();

    expect(component.endTime.toMinutes()).toBe(17 * 60 + 30);
    expect(component.duration.toMinutes()).toBe(8 * 60);
  });

  it('derives the end from an edited duration and books that duration', async () => {
    const result = openBereitschaft();
    component.startTime = OwnTime.forTime('10', '00');
    component.duration = OwnTime.forDuration('06', '30');
    component.onTimeChange();

    expect(component.endTime.toMinutes()).toBe(16 * 60 + 30);
    component.onSave();

    await expect(result).resolves.toEqual({ startTime: '10:00:00', endTime: '16:30:00', workTime: 6.5, dayOffset: 0 });
  });

  it('blocks saving with a zero duration', () => {
    void openBereitschaft();
    component.duration = OwnTime.forDuration('00', '00');
    component.onTimeChange();

    expect(component.isValid()).toBe(false);
    expect(component.errorKey).toBe('dialog.workEdit.error.invalidTime');
  });

  it('blocks a duration longer than the window', () => {
    void component.open({ shiftName: 'Lieferdienst', windowStart: '08:00:00', windowEnd: '20:00:00', workTime: 4 });
    component.duration = OwnTime.forDuration('13', '00');
    component.onTimeChange();

    expect(component.isValid()).toBe(false);
    expect(component.errorKey).toBe('dialog.timeRangeWork.error.outsideWindow');
  });

  it('resolves with the chosen start, the derived end and the shift duration on save', async () => {
    const result = openBereitschaft();
    component.startTime = OwnTime.forTime('08', '00');
    component.onTimeChange();

    component.onSave();

    await expect(result).resolves.toEqual({ startTime: '08:00:00', endTime: '16:00:00', workTime: 8, dayOffset: 0 });
  });

  it('blocks a start whose derived end leaves the window', () => {
    void openBereitschaft();
    component.startTime = OwnTime.forTime('20', '00');
    component.onTimeChange();

    expect(component.isValid()).toBe(false);
    expect(component.errorKey).toBe('dialog.timeRangeWork.error.outsideWindow');
  });

  it('resolves with null on cancel so nothing is booked', async () => {
    const result = openBereitschaft();

    component.onCancel();

    await expect(result).resolves.toBeNull();
  });
});
