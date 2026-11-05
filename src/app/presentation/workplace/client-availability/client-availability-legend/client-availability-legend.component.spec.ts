// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ClientAvailabilityLegendComponent } from './client-availability-legend.component';
import { CheckboxDrawingService } from '../services/render-availability-grid/checkbox-drawing.service';
import { AvailabilityDisplayState } from 'src/app/domain/models/client-availability/availability-display-state.enum';

describe('ClientAvailabilityLegendComponent', () => {
  const symbolDataUrls = signal<ReadonlyMap<AvailabilityDisplayState, string>>(new Map());

  beforeEach(async () => {
    symbolDataUrls.set(new Map());
    await TestBed.configureTestingModule({
      imports: [ClientAvailabilityLegendComponent, TranslateModule.forRoot()],
      providers: [{ provide: CheckboxDrawingService, useValue: { symbolDataUrls } }],
    }).compileComponents();
  });

  it('lists checkmark, cross, partly and empty in that order', () => {
    const fixture = TestBed.createComponent(ClientAvailabilityLegendComponent);
    fixture.detectChanges();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('.legend-label') as NodeListOf<HTMLElement>)
      .map((element) => element.textContent?.trim());

    expect(labels).toEqual([
      'client-availability.legend.available',
      'client-availability.legend.blocked',
      'client-availability.legend.mixed',
      'client-availability.legend.empty',
    ]);
  });

  it('shows the drawn symbols once the grid has initialized them', () => {
    const fixture = TestBed.createComponent(ClientAvailabilityLegendComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('img.legend-symbol').length).toBe(0);

    symbolDataUrls.set(new Map([
      [AvailabilityDisplayState.Available, 'data:image/png;base64,QQ=='],
      [AvailabilityDisplayState.Blocked, 'data:image/png;base64,Qg=='],
      [AvailabilityDisplayState.Mixed, 'data:image/png;base64,RQ=='],
      [AvailabilityDisplayState.Empty, 'data:image/png;base64,RA=='],
    ]));
    fixture.detectChanges();

    const sources = Array.from(fixture.nativeElement.querySelectorAll('img.legend-symbol') as NodeListOf<HTMLImageElement>)
      .map((image) => image.getAttribute('src'));
    expect(sources).toEqual(['data:image/png;base64,QQ==', 'data:image/png;base64,Qg==', 'data:image/png;base64,RQ==', 'data:image/png;base64,RA==']);
  });

  it('explains that the cross also covers the hours blocked by the day rule', () => {
    const fixture = TestBed.createComponent(ClientAvailabilityLegendComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.entries()[1].tooltipKey).toBe('client-availability.legend.blocked-tooltip');
  });

  it('renders the partly entry with the mixed dash symbol and its hover explanation', () => {
    symbolDataUrls.set(new Map([[AvailabilityDisplayState.Mixed, 'data:image/png;base64,RQ==']]));
    const fixture = TestBed.createComponent(ClientAvailabilityLegendComponent);
    fixture.detectChanges();

    const mixedEntry = (fixture.nativeElement.querySelectorAll('.legend-entry') as NodeListOf<HTMLElement>)[2];
    expect(mixedEntry.querySelector('.legend-label')?.textContent?.trim()).toBe('client-availability.legend.mixed');
    expect(mixedEntry.querySelector('img.legend-symbol')?.getAttribute('src')).toBe('data:image/png;base64,RQ==');
    expect(fixture.componentInstance.entries()[2].tooltipKey).toBe('client-availability.legend.mixed-tooltip');
  });
});
