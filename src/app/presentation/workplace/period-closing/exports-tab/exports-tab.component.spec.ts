// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ExportsTabComponent } from './exports-tab.component';
import { DataPeriodClosingService } from 'src/app/infrastructure/api/period-closing/data-period-closing.service';
import { DataExportFormatsService } from 'src/app/infrastructure/api/period-closing/data-export-formats.service';
import { DataGroupService } from 'src/app/infrastructure/api/group/data-group.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';

describe('ExportsTabComponent klacksy targets', () => {
  let targetRequested$: Subject<{ target: string }>;
  let component: ExportsTabComponent;

  beforeEach(async () => {
    targetRequested$ = new Subject<{ target: string }>();

    await TestBed.configureTestingModule({
      imports: [ExportsTabComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataPeriodClosingService, useValue: {} },
        { provide: DataExportFormatsService, useValue: { getFormats: vi.fn().mockReturnValue(of([])) } },
        { provide: DataGroupService, useValue: { readGroupList: vi.fn().mockReturnValue(of({ groups: [] })) } },
        { provide: ToastShowService, useValue: {} },
        {
          provide: EVENT_BUS_TOKEN,
          useValue: { emit: vi.fn(), on: vi.fn().mockReturnValue(targetRequested$.asObservable()), onAny: vi.fn() },
        },
      ],
    })
      .overrideComponent(ExportsTabComponent, { set: { imports: [], template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(ExportsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts on the single order tab', () => {
    expect(component.activeTab()).toBe('single');
  });

  it.each([
    ['period-closing-export-tab-employee', 'employee'],
    ['period-closing-export-employee-group', 'employee'],
    ['period-closing-export-range-form', 'range'],
    ['period-closing-export-range-export', 'range'],
    ['period-closing-export-tab-range', 'range'],
    ['period-closing-export-single-order', 'single'],
  ])('switches to the tab that holds %s', (target, tab) => {
    component.setTab(tab === 'single' ? 'range' : 'single');

    targetRequested$.next({ target });

    expect(component.activeTab()).toBe(tab);
  });

  it('keeps the active tab for targets outside the export tabs', () => {
    component.setTab('employee');

    targetRequested$.next({ target: 'period-closing-audit-filter' });
    targetRequested$.next({ target: 'period-closing-exports' });

    expect(component.activeTab()).toBe('employee');
  });
});
