// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClientAvailabilityClearDayComponent } from './client-availability-clear-day.component';
import { AvailabilityEditService } from '../services/availability-edit.service';

describe('ClientAvailabilityClearDayComponent', () => {
  const canClearDay = signal(false);
  let clearSelectedDay: ReturnType<typeof vi.fn>;

  const button = (fixture: { nativeElement: HTMLElement }): HTMLButtonElement =>
    fixture.nativeElement.querySelector('#client-availability-clear-day-button') as HTMLButtonElement;

  beforeEach(async () => {
    canClearDay.set(false);
    clearSelectedDay = vi.fn().mockReturnValue(true);
    await TestBed.configureTestingModule({
      imports: [ClientAvailabilityClearDayComponent, TranslateModule.forRoot()],
      providers: [{ provide: AvailabilityEditService, useValue: { canClearDay, clearSelectedDay } }],
    }).compileComponents();
  });

  it('is disabled while no cell is selected (or the right is missing)', () => {
    const fixture = TestBed.createComponent(ClientAvailabilityClearDayComponent);
    fixture.detectChanges();

    expect(button(fixture).disabled).toBe(true);
    expect(button(fixture).textContent?.trim()).toBe('client-availability.clear-day.label');
  });

  it('becomes enabled once a day can be cleared and clears it on click', () => {
    const fixture = TestBed.createComponent(ClientAvailabilityClearDayComponent);
    fixture.detectChanges();

    canClearDay.set(true);
    fixture.detectChanges();
    button(fixture).click();

    expect(button(fixture).disabled).toBe(false);
    expect(clearSelectedDay).toHaveBeenCalledTimes(1);
  });
});
