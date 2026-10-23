// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ChangeDetectorRef, NO_ERRORS_SCHEMA, signal, TemplateRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IAbsence } from 'src/app/domain/models/absence/absence.interface';
import { IContainerTemplateItem } from 'src/app/domain/models/container/container-template-item.interface';
import { ContainerTransportModeEnum, TransportModeEnum } from 'src/app/domain/enums/transport-mode.enum';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { AddressProviderService } from 'src/app/domain/services/address-provider.service';
import { DirectionService } from 'src/app/application/services/direction.service';
import { FallbackPipe } from 'src/app/application/pipes/fallback/fallback.pipe';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { collectElementIds, serializeDomStructure } from 'src/app/shared/testing/dom-structure.testing';
import { ContainerTemplateComponent } from './container-template.component';
import { ContainerTemplateRouteService } from './services/container-template-route.service';
import { ContainerTemplatePropertiesService } from './services/container-template-properties.service';
import { ContainerTemplateTabService } from './services/container-template-tab.service';
import { ContainerTemplateShiftOperationsService } from './services/container-template-shift-operations.service';
import { ContainerTemplateAbsenceService } from './services/container-template-absence.service';
import { ContainerTemplateDragDropService } from './services/container-template-drag-drop.service';
import { ContainerTemplateEditorStateService } from './services/container-template-editor-state.service';
import { ContainerTemplateViewRefreshService } from './services/container-template-view-refresh.service';
import { ContainerTemplateTimeWindowService } from './services/container-template-time-window.service';
import { ContainerTemplateSelectionService } from './services/container-template-selection.service';
import { ContainerTemplateSessionService } from './services/container-template-session.service';
import { ContainerTemplateTaskActionsService } from './services/container-template-task-actions.service';
import { ContainerTemplateContextMenuService } from './services/container-template-context-menu.service';

const TRANSPARENT_HOSTS: ReadonlySet<string> = new Set([
  'app-container-template-available-zone',
  'app-container-template-properties-dialog',
  'app-container-template-absence-time-dialog',
]);

const LANGUAGE = 'de';

interface ModalStub {
  close: ReturnType<typeof vi.fn>;
  dismiss: ReturnType<typeof vi.fn>;
}

const absence = (id: string, name: string, color: string): IAbsence =>
  ({
    id,
    name: { de: name },
    abbreviation: { de: `${name}-abbr` },
    description: { de: `${name}-description` },
    color,
  }) as unknown as IAbsence;

const shift = (id: string, overrides: Partial<IShift> = {}): IShift =>
  ({
    id,
    name: `Shift ${id}`,
    abbreviation: `S${id}`,
    startShift: '07:00:00',
    endShift: '11:30:00',
    workTime: 4.5,
    isSporadic: false,
    isTimeRange: false,
    client: { name: `Client ${id}`, addresses: [{ street: 'Main 1', zip: '8000', city: 'Zurich' }] },
    ...overrides,
  }) as unknown as IShift;

const item = (id: string, overrides: Partial<IContainerTemplateItem> = {}): IContainerTemplateItem => ({
  id,
  shiftId: `shift-${id}`,
  startItem: '08:00:00',
  endItem: '12:00:00',
  briefingTime: '00:00:00',
  debriefingTime: '00:00:00',
  travelTimeAfter: '00:00:00',
  travelTimeBefore: '00:00:00',
  timeRangeStartItem: null,
  timeRangeEndItem: null,
  ...overrides,
});

describe('ContainerTemplateComponent (DOM characterization)', () => {
  let fixture: ComponentFixture<ContainerTemplateComponent>;
  let state: Record<string, unknown>;
  let routeService: Record<string, unknown>;
  let tabService: Record<string, unknown>;
  let viewRefresh: Record<string, unknown>;
  let selection: Record<string, ReturnType<typeof vi.fn>>;
  let taskActions: Record<string, ReturnType<typeof vi.fn>>;
  let propertiesService: Record<string, unknown>;
  let absenceService: Record<string, unknown>;
  let selectedItems: ReturnType<typeof signal<IContainerTemplateItem[]>>;

  const render = (): HTMLElement => {
    fixture = TestBed.createComponent(ContainerTemplateComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const refreshThroughParent = (): void => {
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  const renderDialog = (name: 'propertiesModal' | 'absenceTimeModal', modal: ModalStub): HTMLElement => {
    const component = fixture.componentInstance as unknown as Record<string, () => TemplateRef<unknown>>;
    const view = component[name]().createEmbeddedView({ $implicit: modal });
    view.detectChanges();
    const host = document.createElement('div');
    view.rootNodes.forEach((node: Node) => host.appendChild(node));
    return host;
  };

  const zoneRight = (root: HTMLElement): HTMLElement => root.querySelector('.zone-right') as HTMLElement;

  beforeEach(() => {
    selectedItems = signal<IContainerTemplateItem[]>([
      item('a1', { absenceId: 'abs-1', absence: absence('abs-1', 'Holiday', '#ff0000') }),
      item('t1', {
        shift: shift('t1', { isTimeRange: true }),
        timeRangeStartItem: '09:00:00',
        timeRangeEndItem: '10:00:00',
      }),
      item('n1', { shift: shift('n1', { isSporadic: true }) }),
      item('n2', { shift: shift('n2') }),
    ]);

    state = {
      isReadOnly: false,
      readOnlyReason: '',
      containerShift: { name: 'Container A' },
      timeFrom: 'from',
      timeTo: 'to',
      duration: 'duration',
      weekdays: [
        { value: 'monday', labelKey: 'shift.container-template.weekday.monday' },
        { value: 'tuesday', labelKey: 'shift.container-template.weekday.tuesday' },
      ],
      selectedWeekday: 'monday',
      isWeekdaySelectionLocked: false,
      hasHolidayVariant: true,
      isEveryHolidayContainer: false,
      isHoliday: false,
      isHolidayVariantLocked: false,
      timeRangeToleranceValue: 50,
      timeRangeToleranceOptions: {},
      isLoading: false,
      templateGrid: { rows: [] },
    };
    routeService = {
      selectedStartBase: 'Base street 1',
      selectedEndBase: 'Base street 2',
      selectedTransportMode: ContainerTransportModeEnum.byCar,
      hasOpenRouteServiceApiKey: false,
      isAutofillRunning: false,
      isOptimizing: false,
      hasRouteInfo: true,
      isTransportModeMix: true,
      onStartBaseChange: vi.fn(),
      onEndBaseChange: vi.fn(),
      selectTransportMode: vi.fn(),
    };
    tabService = {
      selectedTabIndex: 1,
      isEmploymentTabActive: false,
      containerAbsences: [absence('abs-2', 'Sick', '#00ff00')],
      availableTasks: [shift('p1'), shift('p2', { isTimeRange: true }), shift('p3', { isSporadic: true })],
    };
    viewRefresh = {
      connect: vi.fn(),
      markForCheck: vi.fn(),
      sortBy: vi.fn(),
      getFilteredRowsForSelectedWeekday: vi.fn(() => [[], []]),
      getTabLabel: vi.fn((index: number) => `Tab ${index}`),
    };
    selection = {
      onWeekdayChange: vi.fn(),
      onHolidayVariantChange: vi.fn(),
      selectTab: vi.fn(),
      selectEmploymentTab: vi.fn(),
    };
    taskActions = {
      autofill: vi.fn(),
      optimizeRoute: vi.fn(),
      exportRouteToPdf: vi.fn(),
      exportSelectedShiftsToPdf: vi.fn(),
      compactSelectedShifts: vi.fn(),
      onTaskDrop: vi.fn(),
      removeAllTasks: vi.fn(),
      removeTask: vi.fn(),
      isTimeRangePartial: vi.fn((task: IShift) => task.id === 'p2'),
    };
    propertiesService = {
      contextMenuTargetItem: item('t1', { shift: shift('t1', { isTimeRange: true }) }),
      getPropertiesTimeRangeStart: vi.fn(() => 'range-start'),
      onPropertiesTimeRangeStartChange: vi.fn(),
      getPropertiesBriefingTime: vi.fn(() => 'briefing'),
      onPropertiesBriefingTimeChange: vi.fn(),
      getPropertiesDebriefingTime: vi.fn(() => 'debriefing'),
      onPropertiesDebriefingTimeChange: vi.fn(),
      getPropertiesTravelTimeBefore: vi.fn(() => 'before'),
      onPropertiesTravelTimeBeforeChange: vi.fn(),
      getPropertiesTravelTimeAfter: vi.fn(() => 'after'),
      onPropertiesTravelTimeAfterChange: vi.fn(),
      getPropertiesTransportMode: vi.fn(() => TransportModeEnum.byBicycle),
      selectPropertiesTransportMode: vi.fn(),
    };
    absenceService = {
      absenceModalTitle: 'Absence title',
      absenceStartTime: 'absence-start',
      absenceEndTime: 'absence-end',
      onAbsenceStartTimeChange: vi.fn(),
      onAbsenceEndTimeChange: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ContainerTemplateComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: ContainerTemplateShiftService,
          useValue: {
            selectedContainerTemplateItemsSignal: selectedItems.asReadonly(),
            selectedShiftSignal: signal<IContainerTemplateItem | null>(selectedItems()[3]),
            setSelectedShift: vi.fn(),
          },
        },
        {
          provide: AddressProviderService,
          useValue: {
            allAddresses: signal([
              { name: 'Depot', address: 'Base street 1' },
              { name: 'Office', address: 'Base street 2' },
            ]),
          },
        },
        { provide: DirectionService, useValue: { direction: signal('ltr') } },
      ],
    });
    TestBed.overrideComponent(ContainerTemplateComponent, {
      set: { imports: [TranslateModule, FallbackPipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    TestBed.overrideProvider(TableSortingService, {
      useValue: { getArrow: vi.fn((key: string) => (key === 'name' ? 'asc' : '')) },
    });
    TestBed.overrideProvider(ContainerTemplateEditorStateService, { useValue: state });
    TestBed.overrideProvider(ContainerTemplateRouteService, { useValue: routeService });
    TestBed.overrideProvider(ContainerTemplateTabService, { useValue: tabService });
    TestBed.overrideProvider(ContainerTemplateViewRefreshService, { useValue: viewRefresh });
    TestBed.overrideProvider(ContainerTemplateSelectionService, { useValue: selection });
    TestBed.overrideProvider(ContainerTemplateTaskActionsService, { useValue: taskActions });
    TestBed.overrideProvider(ContainerTemplatePropertiesService, { useValue: propertiesService });
    TestBed.overrideProvider(ContainerTemplateAbsenceService, { useValue: absenceService });
    TestBed.overrideProvider(ContainerTemplateTimeWindowService, {
      useValue: { onTimeFromChange: vi.fn(), onTimeToChange: vi.fn() },
    });
    TestBed.overrideProvider(ContainerTemplateShiftOperationsService, {
      useValue: {
        hasTimeRangeViolation: vi.fn((target: IContainerTemplateItem) => target.id === 't1'),
        getTimeRangeStartTime: vi.fn(() => 'row-range-start'),
        onTimeRangeStartChange: vi.fn(),
      },
    });
    TestBed.overrideProvider(ContainerTemplateDragDropService, {
      useValue: { getConnectedDropLists: vi.fn(() => ['available-tasks-list']), onTaskDrop: vi.fn() },
    });
    TestBed.overrideProvider(ContainerTemplateSessionService, { useValue: { start: vi.fn(), stop: vi.fn() } });
    TestBed.overrideProvider(ContainerTemplateContextMenuService, {
      useValue: {
        openForTimelineShift: vi.fn(),
        openForTableRow: vi.fn(),
        onMenuClick: vi.fn(),
        openAbsenceTimeDialog: vi.fn(),
      },
    });
    TestBed.inject(TranslateService).use(LANGUAGE);
  });

  const normalizedText = (element: Element | null | undefined): string =>
    (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const topLevelStructure = (root: Element): string[] =>
    serializeDomStructure(root, TRANSPARENT_HOSTS).filter((line) => !line.startsWith(' '));

  const cellTexts = (row: Element): string[] => Array.from(row.querySelectorAll('td')).map(normalizedText);

  it('keeps the element ids of header, selected tasks and available tasks in the original order', () => {
    const root = render();

    expect(collectElementIds(root)).toEqual([
      'container-template-wrapper',
      'container-template-header',
      'start-base',
      'end-base',
      'compactShiftsDropdown',
      'selected-tasks-list',
      'selected-tasks-table',
      'available-tasks-table',
      'available-tasks-list',
    ]);
  });

  it('renders the slot tabs with the active tab, the filler and the permanent employment tab', () => {
    const zone = zoneRight(render());

    expect(topLevelStructure(zone)).toEqual(['div.tabs-container', 'div.shifts-grid-container']);
    const tabStrip = Array.from(zone.querySelectorAll('.tabs-container > .tabs > *'));
    expect(tabStrip.map((element) => `${element.tagName.toLowerCase()}.${Array.from(element.classList).sort().join('.')}`)).toEqual([
      'button.tab',
      'button.active.tab',
      'span.filler',
      'button.permanent-tab.tab',
    ]);
    expect(tabStrip.map(normalizedText)).toEqual(['Tab 0', 'Tab 1', '', 'shift.container-template.tab.employment']);
  });

  it('renders the available tasks table with sortable headers, row icons, partial time ranges and formatted cells', () => {
    const zone = zoneRight(render());
    const headers = Array.from(zone.querySelectorAll('#available-tasks-table thead th'));
    const rows = Array.from(zone.querySelectorAll('#available-tasks-table > tbody#available-tasks-list > tr'));

    expect(zone.querySelector('.shifts-grid-container > .shifts-grid > table#available-tasks-table.shifts-table')).not.toBeNull();
    expect(headers.map(normalizedText)).toEqual([
      '',
      'shift.container-template.grid.name asc',
      'shift.container-template.grid.abbreviation',
      'shift.container-template.grid.time',
      'shift.container-template.grid.work-time',
      'shift.container-template.grid.client',
      '',
    ]);
    expect(headers[0].className).toBe('icon-column');
    expect(headers[6].className).toBe('action-column');
    expect(rows.map((row) => row.classList.contains('partial-timerange'))).toEqual([false, true, false]);
    expect(rows.map((row) => row.querySelector('td.icon-column > *')?.tagName.toLowerCase())).toEqual([
      'app-icon-shift-segment',
      'app-icon-time-window',
      'app-icon-unknown-time',
    ]);
    expect(cellTexts(rows[0])).toEqual(['', 'Shift p1', 'Sp1', '07:00 - 11:30', '4:30', 'Client p1: Main 1, 8000, Zurich', '']);
    expect(rows[0].querySelector('td:last-child')?.className).toBe('action-column');
  });

  it('renders the container absences of the employment tab with color, name, abbreviation and description', () => {
    tabService['isEmploymentTabActive'] = true;

    const zone = zoneRight(render());
    const rows = Array.from(zone.querySelectorAll('tbody#container-absences-list > tr'));

    expect(topLevelStructure(zone)).toEqual(['div.tabs-container', 'div.shifts-grid-container']);
    expect(zone.querySelector('#available-tasks-table')).toBeNull();
    expect(Array.from(zone.querySelectorAll('table.shifts-table thead th')).map(normalizedText)).toEqual([
      '',
      'shift.container-template.grid.name',
      'shift.container-template.grid.abbreviation',
      'setting.absence.modal.description',
    ]);
    expect(rows.length).toBe(1);
    expect(cellTexts(rows[0])).toEqual(['', 'Sick', 'Sick-abbr', 'Sick-description']);
    expect((rows[0].querySelector('td.icon-column > span.absence-color-rect') as HTMLElement).style.backgroundColor).toBe(
      'rgb(0, 255, 0)',
    );
    expect(zone.querySelector('.tabs .permanent-tab')?.classList.contains('active')).toBe(false);
  });

  it('renders the empty states of both tabs', () => {
    tabService['availableTasks'] = [];
    const slotZone = zoneRight(render());

    expect(normalizedText(slotZone.querySelector('.shifts-grid-container > .shifts-grid > .no-shifts > p'))).toBe(
      'shift.container-template.grid.no-shifts',
    );

    tabService['isEmploymentTabActive'] = true;
    tabService['containerAbsences'] = [];
    const employmentZone = zoneRight(render());

    expect(normalizedText(employmentZone.querySelector('.shifts-grid-container > .shifts-grid > .no-shifts > p'))).toBe(
      'shift.container-template.grid.no-container-absences',
    );
  });

  it('renders the loading and the no-container states of the bottom zone', () => {
    state['isLoading'] = true;
    const loadingZone = zoneRight(render());

    expect(topLevelStructure(loadingZone)).toEqual(['div.loading-indicator']);
    expect(normalizedText(loadingZone.querySelector('.loading-indicator > p'))).toBe('common.loading');

    state['isLoading'] = false;
    state['templateGrid'] = null;
    const noContainerZone = zoneRight(render());

    expect(topLevelStructure(noContainerZone)).toEqual(['div.no-data']);
    expect(normalizedText(noContainerZone.querySelector('.no-data > p'))).toBe(
      'shift.container-template.no-container-selected',
    );
  });

  it('refreshes the bottom zone when only the parent view is marked for check', () => {
    const root = render();
    tabService['availableTasks'] = [shift('late')];
    tabService['selectedTabIndex'] = 0;

    refreshThroughParent();

    const rows = Array.from(root.querySelectorAll('#available-tasks-list tr'));
    expect(rows.map((row) => normalizedText(row.querySelector('td:nth-child(2)')))).toEqual(['Shift late']);
    expect(normalizedText(root.querySelector('.tabs .tab.active'))).toBe('Tab 0');
  });

  it('wires the tab buttons and the sortable headers of the bottom zone to the services', () => {
    const root = render();
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('.tabs .tab'));

    tabs[0].click();
    tabs[tabs.length - 1].click();
    root.querySelectorAll<HTMLElement>('#available-tasks-table thead th')[1].click();
    root.querySelectorAll<HTMLElement>('#available-tasks-table thead th')[5].click();

    expect(selection['selectTab']).toHaveBeenCalledWith(0);
    expect(selection['selectEmploymentTab']).toHaveBeenCalledTimes(1);
    expect(viewRefresh['sortBy']).toHaveBeenNthCalledWith(1, 'name');
    expect(viewRefresh['sortBy']).toHaveBeenNthCalledWith(2, 'client');
  });

  it('renders the properties dialog of a time range item in mix mode with every field', () => {
    render();

    const dialog = renderDialog('propertiesModal', { close: vi.fn(), dismiss: vi.fn() });

    expect(topLevelStructure(dialog)).toEqual(['div.modal-header', 'div.first-modal.modal-body', 'div.modal-footer']);
    expect(normalizedText(dialog.querySelector('.modal-header > .container-header-modal.modal-title'))).toBe(
      'shift.container-template.context-menu.properties',
    );
    expect(collectElementIds(dialog)).toEqual([
      'timeRangeStartItem',
      'briefingTime',
      'debriefingTime',
      'travelTimeBefore',
      'travelTimeAfter',
    ]);
    expect(dialog.querySelectorAll('.modal-body > .row-line-modal-inline1').length).toBe(3);
    expect(dialog.querySelectorAll('.row-line-modal-inline1 > .property-field').length).toBe(6);
    expect(normalizedText(dialog.querySelector('.property-field .readonly-value'))).toBe('4:30');
    expect(
      Array.from(dialog.querySelectorAll('.modal-body > .transport-mode-group .transport-mode-btn')).map((button) =>
        button.classList.contains('active'),
      ),
    ).toEqual([false, true, false]);
    expect(normalizedText(dialog.querySelector('.modal-body > .time-range-info-box'))).toBe(
      'shift.container-template.properties.time-range-info',
    );
    expect(normalizedText(dialog.querySelector('.modal-footer > .link-button.red-font'))).toBe('cancel');
    expect(normalizedText(dialog.querySelector('.modal-footer > button.btn.save-btn'))).toBe('save');
  });

  it('renders the properties dialog of a plain item outside mix mode without time range and transport fields', () => {
    propertiesService['contextMenuTargetItem'] = item('n2', { shift: shift('n2') });
    routeService['isTransportModeMix'] = false;
    render();

    const dialog = renderDialog('propertiesModal', { close: vi.fn(), dismiss: vi.fn() });

    expect(collectElementIds(dialog)).toEqual(['briefingTime', 'debriefingTime', 'travelTimeBefore', 'travelTimeAfter']);
    expect(dialog.querySelectorAll('.modal-body > .row-line-modal-inline1').length).toBe(2);
    expect(dialog.querySelector('.time-range-info-box')).toBeNull();
    expect(dialog.querySelector('.transport-mode-group')).toBeNull();
  });

  it('wires close, cancel, save and the transport buttons of the properties dialog', () => {
    render();
    const modal: ModalStub = { close: vi.fn(), dismiss: vi.fn() };
    const dialog = renderDialog('propertiesModal', modal);

    (dialog.querySelector('.modal-header .close') as HTMLElement).click();
    (dialog.querySelector('.modal-footer .link-button') as HTMLElement).click();
    (dialog.querySelector('.modal-footer .save-btn') as HTMLElement).click();
    (dialog.querySelectorAll('.transport-mode-btn')[2] as HTMLElement).click();

    expect(modal.dismiss).toHaveBeenCalledTimes(2);
    expect(modal.close).toHaveBeenCalledTimes(1);
    expect(propertiesService['selectPropertiesTransportMode']).toHaveBeenCalledWith(TransportModeEnum.byFoot);
  });

  it('renders the absence time dialog with title, both time fields and wires its buttons', () => {
    render();
    const modal: ModalStub = { close: vi.fn(), dismiss: vi.fn() };

    const dialog = renderDialog('absenceTimeModal', modal);

    expect(topLevelStructure(dialog)).toEqual(['div.modal-header', 'div.first-modal.modal-body', 'div.modal-footer']);
    expect(normalizedText(dialog.querySelector('.modal-title'))).toBe('Absence title');
    expect(Array.from(dialog.querySelectorAll('.row-line-modal-inline1 > .property-field > label')).map(normalizedText)).toEqual([
      'shift.container-template.properties.start-time',
      'shift.container-template.properties.end-time',
    ]);

    (dialog.querySelector('.modal-header .close') as HTMLElement).click();
    (dialog.querySelector('.modal-footer .link-button') as HTMLElement).click();
    (dialog.querySelector('.modal-footer .save-btn') as HTMLElement).click();

    expect(modal.dismiss).toHaveBeenCalledTimes(2);
    expect(modal.close).toHaveBeenCalledTimes(1);
  });
});
