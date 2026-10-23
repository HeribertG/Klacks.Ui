// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { ContainerTemplateEditorStateService } from '../services/container-template-editor-state.service';
import { ContainerTemplateTabService } from '../services/container-template-tab.service';
import { ContainerTemplateViewRefreshService } from '../services/container-template-view-refresh.service';
import { ContainerTemplateSelectionService } from '../services/container-template-selection.service';
import { ContainerTemplateTaskActionsService } from '../services/container-template-task-actions.service';
import { ContainerTemplateAvailableZoneComponent } from './container-template-available-zone.component';

const task = (id: string): IShift =>
  ({ id, name: `Task ${id}`, abbreviation: id, startShift: '06:00:00', endShift: '10:00:00', workTime: 4 }) as IShift;

describe('ContainerTemplateAvailableZoneComponent', () => {
  let fixture: ComponentFixture<ContainerTemplateAvailableZoneComponent>;
  let state: Record<string, unknown>;
  let tabService: Record<string, unknown>;
  let selection: Record<string, ReturnType<typeof vi.fn>>;

  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ContainerTemplateAvailableZoneComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    state = { isLoading: false, templateGrid: {} };
    tabService = {
      selectedTabIndex: 0,
      isEmploymentTabActive: false,
      containerAbsences: [],
      availableTasks: [task('a'), task('b')],
    };
    selection = { selectTab: vi.fn(), selectEmploymentTab: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ContainerTemplateAvailableZoneComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ContainerTemplateEditorStateService, useValue: state },
        { provide: ContainerTemplateTabService, useValue: tabService },
        {
          provide: ContainerTemplateViewRefreshService,
          useValue: {
            getFilteredRowsForSelectedWeekday: () => [[], []],
            getTabLabel: (index: number) => `Tab ${index}`,
            sortBy: vi.fn(),
            markForCheck: vi.fn(),
          },
        },
        { provide: ContainerTemplateSelectionService, useValue: selection },
        { provide: TableSortingService, useValue: { getArrow: () => '' } },
        { provide: ContainerTemplateTaskActionsService, useValue: { isTimeRangePartial: () => false } },
      ],
    });
  });

  it('lists the available tasks of the selected slot tab and marks that tab active', () => {
    const root = render();

    const names = Array.from(root.querySelectorAll('#available-tasks-list tr td:nth-child(2)')).map((cell) =>
      cell.textContent?.trim(),
    );
    expect(names).toEqual(['Task a', 'Task b']);
    expect(root.querySelector('.tabs .tab.active')?.textContent?.trim()).toBe('Tab 0');
  });

  it('forwards tab clicks to the selection service', () => {
    const root = render();
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('.tabs .tab'));

    tabs[1].click();
    tabs[tabs.length - 1].click();

    expect(selection['selectTab']).toHaveBeenCalledWith(1);
    expect(selection['selectEmploymentTab']).toHaveBeenCalledTimes(1);
  });

  it('shows the loading hint instead of the tabs while the container loads', () => {
    state['isLoading'] = true;

    const root = render();

    expect(root.querySelector('.loading-indicator')).not.toBeNull();
    expect(root.querySelector('.tabs-container')).toBeNull();
  });
});
