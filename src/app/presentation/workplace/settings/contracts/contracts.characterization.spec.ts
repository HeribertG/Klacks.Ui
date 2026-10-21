// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationRef, EventEmitter, getDebugNode, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbConfig, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';
import { afterEach, describe, expect, it, Mock, vi } from 'vitest';

import { ContractsComponent } from './contracts.component';
import { DataManagementContractService } from 'src/app/domain/services/contract/data-management-contract.service';
import { DataManagementMonthlyTargetHoursService } from 'src/app/domain/services/scheduling/data-management-monthly-target-hours.service';
import { DataManagementSettingsService } from 'src/app/domain/services/settings/data-management-settings.service';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { IContract } from 'src/app/domain/models/contract/contract.interface';
import { PaymentInterval } from 'src/app/domain/models/contract/payment-interval.enum';
import { ICalendarSelection } from 'src/app/domain/models/calendar/calendar-selection.interface';
import { ISchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.interface';
import { IIndividualPeriod } from 'src/app/domain/models/scheduling/individual-period.interface';
import { OwnTime } from 'src/app/domain/models/schedule/own-time-class';
import { TimeInputComponent } from 'src/app/presentation/shared/time-input/time-input.component';
import { DateInputComponent } from 'src/app/presentation/shared/date-input/date-input.component';

interface ContractServiceMock {
  contracts: IContract[];
  availableCalendars: ICalendarSelection[];
  availableSchedulingRules: ISchedulingRule[];
  availableIndividualPeriods: IIndividualPeriod[];
  isRead: WritableSignal<boolean>;
  init: Mock;
  createContract: Mock;
  prepareContractForEdit: Mock;
  saveExistingContract: Mock;
  deleteContract: Mock;
  readContracts: Mock;
  validateContract: Mock;
  loadIndividualPeriods: Mock;
  ensureAssignedSchedulingRuleIsSelectable: Mock;
}

interface ModalServiceMock {
  resultEvent: Subject<ModalType>;
  Filing: string;
  componentContext: string;
  deleteMessage: string;
  setDefault: Mock;
  openModel: Mock;
}

interface TranslateMock {
  lang: string;
  service: Partial<TranslateService>;
  onLangChange: EventEmitter<unknown>;
}

interface SetupOptions {
  contracts?: IContract[];
  calendars?: ICalendarSelection[];
  rules?: ISchedulingRule[];
  periods?: IIndividualPeriod[];
  monthlyHours?: number;
}

const CALENDAR_ONE = { id: 'cal-1', name: 'Calendar 1' } as ICalendarSelection;
const CALENDAR_TWO = { id: 'cal-2', name: 'Calendar 2' } as ICalendarSelection;
const RULE_STANDARD = { id: 'r-1', name: 'Standard' } as ISchedulingRule;
const RULE_LEGACY = { id: 'r-9', name: 'Legacy' } as ISchedulingRule;
const PERIOD_QUARTER: IIndividualPeriod = { id: 'p-1', name: 'Quarter', periods: [] };
const NAME_DEBOUNCE_WAIT_MS = 350;
const SCROLL_WAIT_MS = 200;
const LIST_SCROLL_HEIGHT = 500;

function makeContract(overrides: Partial<IContract> = {}): IContract {
  return {
    id: 'c-1',
    name: 'Alpha',
    guaranteedHours: 170,
    minimumHours: 160,
    maximumHours: 200,
    fullTime: 180,
    nightRate: 10,
    holidayRate: 15,
    we1Rate: 5,
    we2Rate: 5,
    we3Rate: 5,
    nightStart: '23:00',
    nightEnd: '06:00',
    paymentInterval: PaymentInterval.Monthly,
    percent: undefined,
    validFrom: new Date(2024, 0, 1),
    validUntil: undefined,
    calendarSelection: undefined,
    calendarSelectionId: undefined,
    schedulingRuleId: undefined,
    individualPeriodId: undefined,
    workOnMonday: true,
    workOnTuesday: true,
    workOnWednesday: true,
    workOnThursday: true,
    workOnFriday: true,
    workOnSaturday: false,
    workOnSunday: false,
    performsShiftWork: null,
    ...overrides,
  };
}

function createTranslateMock(): TranslateMock {
  const onLangChange = new EventEmitter<unknown>();
  const mock: TranslateMock = {
    lang: 'de',
    onLangChange,
    service: {},
  };
  mock.service = {
    instant: vi.fn((key: string | string[], params?: object) =>
      `${mock.lang}:${String(key)}${params ? JSON.stringify(params) : ''}`
    ),
    get: vi.fn((key: string | string[]) => of(key)),
    onTranslationChange: new EventEmitter(),
    onLangChange,
    onDefaultLangChange: new EventEmitter(),
  } as unknown as Partial<TranslateService>;
  return mock;
}

function createContractService(options: SetupOptions): ContractServiceMock {
  const service: ContractServiceMock = {
    contracts: options.contracts ?? [],
    availableCalendars: options.calendars ?? [],
    availableSchedulingRules: options.rules ?? [],
    availableIndividualPeriods: options.periods ?? [],
    isRead: signal(false),
    init: vi.fn().mockResolvedValue(undefined),
    createContract: vi.fn(),
    prepareContractForEdit: vi.fn(),
    saveExistingContract: vi.fn().mockResolvedValue(true),
    deleteContract: vi.fn().mockResolvedValue(true),
    readContracts: vi.fn().mockResolvedValue([]),
    validateContract: vi.fn().mockReturnValue([]),
    loadIndividualPeriods: vi.fn().mockResolvedValue(undefined),
    ensureAssignedSchedulingRuleIsSelectable: vi.fn(),
  };
  service.ensureAssignedSchedulingRuleIsSelectable.mockImplementation(async (ruleId: string | undefined) => {
    if (ruleId !== RULE_LEGACY.id) {
      return undefined;
    }
    service.availableSchedulingRules = [...service.availableSchedulingRules, RULE_LEGACY];
    return RULE_LEGACY;
  });
  return service;
}

function createModalService(): ModalServiceMock {
  return {
    resultEvent: new Subject<ModalType>(),
    Filing: '',
    componentContext: '',
    deleteMessage: '',
    setDefault: vi.fn(),
    openModel: vi.fn(),
  };
}

function partsOf(fixture: ComponentFixture<ContractsComponent>) {
  const component = fixture.componentInstance;
  return {
    state: component,
    hours: component,
    payment: component,
    assignment: component,
    shiftWork: component,
    validity: component,
    list: component,
    session: component,
  };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function zoneTick(): void {
  TestBed.inject(ApplicationRef).tick();
}

async function settle(fixture: ComponentFixture<ContractsComponent>): Promise<void> {
  fixture.detectChanges();
  await flush();
  zoneTick();
  fixture.detectChanges();
  await fixture.whenStable();
  zoneTick();
}

async function setup(options: SetupOptions = {}) {
  const contractService = createContractService(options);
  const monthlyTargetHours = {
    init: vi.fn().mockResolvedValue(undefined),
    hoursOf: vi.fn().mockReturnValue(options.monthlyHours),
  };
  const settings = {
    appSettings: {
      schedulingDefaultSettings: signal({ guaranteedHours: 170, fullTime: 190 }),
    },
  };
  const modalService = createModalService();
  const translate = createTranslateMock();

  TestBed.configureTestingModule({
    imports: [ContractsComponent, TranslateModule.forRoot()],
    providers: [
      { provide: DataManagementContractService, useValue: contractService },
      { provide: DataManagementMonthlyTargetHoursService, useValue: monthlyTargetHours },
      { provide: DataManagementSettingsService, useValue: settings },
      { provide: ModalService, useValue: modalService },
      { provide: TranslateService, useValue: translate.service },
    ],
  });
  TestBed.inject(NgbConfig).animation = false;
  const registry = TestBed.inject(DataRefreshRegistry);

  const fixture = TestBed.createComponent(ContractsComponent);
  await settle(fixture);

  return {
    fixture,
    component: fixture.componentInstance,
    parts: partsOf(fixture),
    contractService,
    monthlyTargetHours,
    modalService,
    translate,
    registry,
  };
}

function host(fixture: ComponentFixture<ContractsComponent>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function modalEl<T extends Element = HTMLElement>(selector: string): T | null {
  return document.body.querySelector<T>(`ngb-modal-window ${selector}`);
}

function modalTexts(selector: string): string[] {
  return Array.from(document.body.querySelectorAll(`ngb-modal-window ${selector}`)).map(
    (element) => element.textContent?.trim() ?? ''
  );
}

function isModalOpen(): boolean {
  return document.body.querySelector('ngb-modal-window') !== null;
}

function rowNames(fixture: ComponentFixture<ContractsComponent>): string[] {
  return Array.from(host(fixture).querySelectorAll<HTMLInputElement>('app-contract-row input')).map(
    (input) => input.value
  );
}

function rowHostIds(fixture: ComponentFixture<ContractsComponent>): string[] {
  return Array.from(host(fixture).querySelectorAll('app-contract-row')).map((row) => row.id);
}

function trackListScroll(fixture: ComponentFixture<ContractsComponent>): { scrollTop: number } {
  const box = host(fixture).querySelector<HTMLElement>('[rows]')!;
  const tracked = { scrollTop: 0 };
  Object.defineProperty(box, 'scrollHeight', { configurable: true, get: () => LIST_SCROLL_HEIGHT });
  Object.defineProperty(box, 'scrollTop', {
    configurable: true,
    get: () => tracked.scrollTop,
    set: (value: number) => {
      tracked.scrollTop = value;
    },
  });
  return tracked;
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function componentOf<T>(selector: string): T {
  const element = modalEl(selector);
  return getDebugNode(element)!.componentInstance as T;
}

function dropdownItem(sectionId: string, text: string): HTMLButtonElement {
  const items = Array.from(
    document.body.querySelectorAll<HTMLButtonElement>(`ngb-modal-window #${sectionId} .dropdown-item`)
  );
  return items.find((item) => item.textContent?.trim() === text)!;
}

async function openEdit(fixture: ComponentFixture<ContractsComponent>, contractId: string): Promise<void> {
  host(fixture).querySelector<HTMLInputElement>(`#contract-row-name-${contractId}`)!.click();
  await settle(fixture);
}

describe('ContractsComponent characterization', () => {
  afterEach(() => {
    TestBed.inject(NgbModal).dismissAll();
    TestBed.resetTestingModule();
  });

  describe('contract list', () => {
    it('renders one row per contract and filters them by the header search', async () => {
      const { fixture } = await setup({
        contracts: [makeContract(), makeContract({ id: 'c-2', name: 'Beta' })],
      });

      expect(rowNames(fixture)).toEqual(['Alpha', 'Beta']);
      expect(rowHostIds(fixture)).toEqual(['contract-row-0', 'contract-row-1']);

      fixture.debugElement.query(By.css('app-settings-list-card')).triggerEventHandler('headerSearchChange', 'BET');
      await settle(fixture);

      expect(rowNames(fixture)).toEqual(['Beta']);
      expect(rowHostIds(fixture)).toEqual(['contract-row-0']);
    });

    it('re-renders the rows when the service signals a completed read', async () => {
      const { fixture, contractService } = await setup({ contracts: [makeContract()] });

      contractService.contracts = [makeContract({ id: 'c-3', name: 'Gamma' })];
      contractService.isRead.set(true);
      await settle(fixture);

      expect(rowNames(fixture)).toEqual(['Gamma']);
    });

    it('reload re-reads the contracts and shows the new list', async () => {
      const { fixture, component, contractService } = await setup({ contracts: [makeContract()] });
      contractService.readContracts.mockImplementation(async () => {
        contractService.contracts = [makeContract({ id: 'c-4', name: 'Delta' })];
        return contractService.contracts;
      });

      component.reload();
      await settle(fixture);

      expect(contractService.readContracts).toHaveBeenCalledTimes(1);
      expect(rowNames(fixture)).toEqual(['Delta']);
    });

    it('registers for Klacksy refreshes after the view init and unregisters on destroy', async () => {
      const { fixture, component, registry } = await setup();

      expect(registry.matching(component.refreshableEntities)).toContain(component);

      fixture.destroy();

      expect(registry.matching(component.refreshableEntities)).not.toContain(component);
    });

    it('initialises the contracts before the monthly target hours', async () => {
      const { contractService, monthlyTargetHours } = await setup();

      expect(contractService.init).toHaveBeenCalledTimes(1);
      expect(monthlyTargetHours.init).toHaveBeenCalledTimes(1);
      expect(monthlyTargetHours.hoursOf).toHaveBeenCalledTimes(1);
      expect(contractService.init.mock.invocationCallOrder[0]).toBeLessThan(
        monthlyTargetHours.init.mock.invocationCallOrder[0]
      );
    });
  });

  describe('delete flow', () => {
    it('row delete opens the shared delete modal for the row index', async () => {
      const { fixture, modalService } = await setup({
        contracts: [makeContract(), makeContract({ id: 'c-2', name: 'Beta' })],
      });

      host(fixture).querySelector<HTMLElement>('#contract-row-delete-c-2')!.click();

      expect(modalService.componentContext).toBe('contracts');
      expect(modalService.Filing).toBe('1');
      expect(modalService.deleteMessage).toBe(DomainMessages.DELETE_ENTRY);
      expect(modalService.setDefault).toHaveBeenCalledWith(ModalType.Delete);
      expect(modalService.openModel).toHaveBeenCalledWith(ModalType.Delete);
    });

    it('a confirmed delete removes the saved contract by id and resets the modal context', async () => {
      const { modalService, contractService } = await setup({
        contracts: [makeContract(), makeContract({ id: 'c-2', name: 'Beta' })],
      });
      modalService.componentContext = 'contracts';
      modalService.Filing = '1';

      modalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(contractService.deleteContract).toHaveBeenCalledWith('c-2');
      expect(modalService.componentContext).toBe('');
      expect(modalService.Filing).toBe('');
    });

    it('a confirmed delete of an unsaved contract removes it locally', async () => {
      const { fixture, modalService, contractService } = await setup({
        contracts: [makeContract(), makeContract({ id: undefined, name: 'Draft' })],
      });
      modalService.componentContext = 'contracts';
      modalService.Filing = '1';

      modalService.resultEvent.next(ModalType.Delete);
      await settle(fixture);

      expect(contractService.deleteContract).not.toHaveBeenCalled();
      expect(contractService.contracts.map((c) => c.name)).toEqual(['Alpha']);
      expect(rowNames(fixture)).toEqual(['Alpha']);
    });

    it('ignores confirmations of another component and after destroy', async () => {
      const { fixture, modalService, contractService } = await setup({ contracts: [makeContract()] });
      modalService.componentContext = 'branches';
      modalService.Filing = '0';
      modalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(contractService.deleteContract).not.toHaveBeenCalled();
      expect(modalService.componentContext).toBe('branches');

      fixture.destroy();
      modalService.componentContext = 'contracts';
      modalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(contractService.deleteContract).not.toHaveBeenCalled();
    });
  });

  describe('opening the dialog', () => {
    it('a row click opens a large dialog with the values of a clone of the contract', async () => {
      const listed = makeContract({ calendarSelectionId: undefined });
      const { fixture, parts, contractService } = await setup({ contracts: [listed] });

      await openEdit(fixture, 'c-1');

      expect(document.body.querySelector('ngb-modal-window')!.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(document.body.querySelector('ngb-modal-window .modal-dialog.modal-lg')).not.toBeNull();
      expect(contractService.prepareContractForEdit).toHaveBeenCalledTimes(1);
      expect(contractService.prepareContractForEdit.mock.calls[0][0]).not.toBe(listed);
      expect(contractService.loadIndividualPeriods).toHaveBeenCalledTimes(1);
      expect(parts.state.editingContract).not.toBe(listed);
      expect(parts.state.originalContract).toBe(listed);
      expect(parts.state.isNewContract).toBe(false);

      expect(modalEl<HTMLInputElement>('#contractName')!.value).toBe('Alpha');
      expect(modalEl<HTMLInputElement>('#guaranteedHours')!.value).toBe('170');
      expect(modalEl<HTMLInputElement>('#minHours')!.value).toBe('160');
      expect(modalEl<HTMLInputElement>('#maxHours')!.value).toBe('200');
      expect(modalEl<HTMLInputElement>('#fullTime')!.value).toBe('180');
      expect(modalEl<HTMLInputElement>('#nightRate')!.value).toBe('10');
      expect(modalEl<HTMLInputElement>('#holidayRate')!.value).toBe('15');
      expect(modalEl<HTMLInputElement>('#contractNightStart')!.value).toBe('23:00');
      expect(modalTexts('#contract-payment-interval-dropdown .selector-name')).toEqual([
        'de:settings.work.payment-monthly',
      ]);
      expect(modalTexts('#contract-calendar-dropdown .selector-name')).toEqual(['de:setting.contract.noCalendar']);
      expect(modalTexts('#contract-scheduling-rule-dropdown .selector-name')).toEqual([
        'de:setting.contract.noSchedulingRule',
      ]);
      expect(modalEl('#contract-modal-percent')).toBeNull();
      expect(modalEl('#contract-modal-individual-period')).toBeNull();
      expect(modalEl('#contract-modal-validation-row')).toBeNull();
    });

    it('add opens the dialog for a new contract after a timeout', async () => {
      const created = makeContract({ id: undefined, name: '' });
      const { fixture, parts, contractService } = await setup();
      contractService.createContract.mockReturnValue(created);

      host(fixture).querySelector<HTMLElement>('#contracts-add-btn')!.click();

      expect(isModalOpen()).toBe(false);
      expect(parts.state.editingContract).toBe(created);
      expect(parts.state.originalContract).toBeNull();
      expect(parts.state.isNewContract).toBe(true);
      expect(contractService.loadIndividualPeriods).toHaveBeenCalledTimes(1);

      await settle(fixture);

      expect(isModalOpen()).toBe(true);
      expect(modalEl<HTMLInputElement>('#contractName')!.value).toBe('');
    });
  });

  describe('hours section', () => {
    it('the reset button switches to the company value and hides the explicit hour fields', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      modalEl<HTMLButtonElement>('#contract-modal-guaranteed-hours-reset-btn')!.click();
      await settle(fixture);

      expect(parts.state.editingContract!.guaranteedHours).toBeUndefined();
      expect(modalEl('#contract-modal-guaranteed-hours-reset-btn')).toBeNull();
      expect(modalEl('#contract-modal-min-hours-item')).toBeNull();
      expect(modalEl('#contract-modal-max-hours-item')).toBeNull();
      expect(modalEl('#contract-modal-fulltime-item')).toBeNull();
      expect(modalTexts('#contract-modal-guaranteed-hours-inherited-hint')[0]).toContain('170:00');
      expect(modalTexts('#contract-modal-guaranteed-hours-inherited-hint')[0]).toContain(
        'setting.contract.companyValue'
      );
      const guaranteed = modalEl<HTMLInputElement>('#guaranteedHours')!;
      expect(guaranteed.value).toBe('');
      expect(guaranteed.placeholder).toBe('170');
    });

    it('a typed guaranteed value leaves the inherited state and shows the explicit fields', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract({ guaranteedHours: undefined })] });
      await openEdit(fixture, 'c-1');
      expect(modalEl('#contract-modal-min-hours-item')).toBeNull();

      componentOf<TimeInputComponent>('#contract-modal-guaranteed-hours-input').valueChange.emit(
        OwnTime.forDuration('150', '00')
      );
      await settle(fixture);

      expect(parts.state.editingContract!.guaranteedHours).toBe(150);
      expect(modalEl('#contract-modal-guaranteed-hours-inherited-hint')).toBeNull();
      expect(modalEl('#contract-modal-guaranteed-hours-reset-btn')).not.toBeNull();
      expect(modalEl('#contract-modal-min-hours-item')).not.toBeNull();
    });

    it('the min, max and full-time inputs write their values to the contract', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      componentOf<TimeInputComponent>('#contract-modal-min-hours-input').valueChange.emit(
        OwnTime.forDuration('100', '30')
      );
      componentOf<TimeInputComponent>('#contract-modal-max-hours-input').valueChange.emit(
        OwnTime.forDuration('210', '00')
      );
      componentOf<TimeInputComponent>('#contract-modal-fulltime-input').valueChange.emit(
        OwnTime.forDuration('0', '00')
      );
      await settle(fixture);

      expect(parts.state.editingContract!.minimumHours).toBe(100.5);
      expect(parts.state.editingContract!.maximumHours).toBe(210);
      expect(parts.state.editingContract!.fullTime).toBe(0);
      const fullTime = modalEl<HTMLInputElement>('#fullTime')!;
      expect(fullTime.placeholder).toBe('190');
      expect(fullTime.classList.contains('inherited-placeholder')).toBe(true);
    });

    it('the inherited hint scales the monthly target hours by the contract percent', async () => {
      const { fixture } = await setup({
        monthlyHours: 168,
        contracts: [
          makeContract({
            guaranteedHours: undefined,
            paymentInterval: PaymentInterval.MonthlyTargetHours,
            percent: 50,
          }),
        ],
      });
      await openEdit(fixture, 'c-1');

      expect(modalTexts('#contract-modal-guaranteed-hours-inherited-hint')[0]).toContain('84:00');
      expect(modalEl<HTMLInputElement>('#guaranteedHours')!.placeholder).toBe('84');
      expect(modalEl<HTMLInputElement>('#contract-percent')).not.toBeNull();
    });
  });

  describe('rates and night window', () => {
    it('typed rates are clamped, a cleared rate saves as standard and the night window is saved', async () => {
      const listed = makeContract();
      const { fixture, contractService } = await setup({ contracts: [listed] });
      await openEdit(fixture, 'c-1');

      typeInto(modalEl<HTMLInputElement>('#nightRate')!, '150');
      typeInto(modalEl<HTMLInputElement>('#holidayRate')!, '');
      typeInto(modalEl<HTMLInputElement>('#we3Rate')!, '0');
      typeInto(modalEl<HTMLInputElement>('#contractNightStart')!, '22:00');
      typeInto(modalEl<HTMLInputElement>('#contractNightEnd')!, '');
      await settle(fixture);

      expect(modalEl<HTMLInputElement>('#nightRate')!.value).toBe('100');

      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      await settle(fixture);

      expect(contractService.saveExistingContract).toHaveBeenCalledWith(listed);
      expect(listed.nightRate).toBe(100);
      expect(listed.holidayRate).toBeNull();
      expect(listed.we3Rate).toBe(0);
      expect(listed.nightStart).toBe('22:00');
      expect(listed.nightEnd).toBeNull();
    });

    it('shows the standard placeholder and the rates hint', async () => {
      const { fixture } = await setup({ contracts: [makeContract({ we1Rate: null })] });
      await openEdit(fixture, 'c-1');

      const we1 = modalEl<HTMLInputElement>('#we1Rate')!;
      expect(we1.value).toBe('');
      expect(we1.placeholder).toBe('setting.contract.rate-standard-placeholder');
      expect(modalTexts('#contract-modal-rates-hint')).toEqual(['setting.contract.rates-standard-hint']);
      expect(modalTexts('#contract-modal-rates-row .rate-unit')).toEqual(['%', '%', '%', '%']);
    });
  });

  describe('work days and shift work', () => {
    it('the workday checkboxes show and write the contract days', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      const boxes = Array.from(
        document.body.querySelectorAll<HTMLInputElement>('ngb-modal-window #contract-modal-workdays-row input')
      );
      expect(boxes.map((box) => box.checked)).toEqual([true, true, true, true, true, false, false]);
      expect(modalTexts('#contract-modal-workdays-row .checkbox-label')).toEqual([
        'settings.work.monday',
        'settings.work.tuesday',
        'settings.work.wednesday',
        'settings.work.thursday',
        'settings.work.friday',
        'settings.work.saturday',
        'settings.work.sunday',
      ]);

      boxes[5].click();
      boxes[0].click();
      await settle(fixture);

      expect(parts.state.editingContract!.workOnSaturday).toBe(true);
      expect(parts.state.editingContract!.workOnMonday).toBe(false);
    });

    it('the tri-state shift-work checkbox cycles and relabels its legend', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract({ performsShiftWork: null })] });
      await openEdit(fixture, 'c-1');

      const checkbox = modalEl<HTMLInputElement>('#contract-modal-performs-shift-work')!;
      expect(checkbox.indeterminate).toBe(true);
      expect(modalTexts('#contract-modal-shift-work-legend')).toEqual(['setting.contract.performsShiftWork-unset']);

      checkbox.click();
      await settle(fixture);

      expect(parts.state.editingContract!.performsShiftWork).toBe(true);
      expect(checkbox.checked).toBe(true);
      expect(checkbox.indeterminate).toBe(false);
      expect(modalTexts('#contract-modal-shift-work-legend')).toEqual(['setting.contract.performsShiftWork-enabled']);
      expect(modalEl('#contract-modal-shift-work-row .checkbox-label')!.getAttribute('title')).toBe(
        'setting.contract.performsShiftWork-enabled'
      );

      checkbox.click();
      await settle(fixture);

      expect(parts.state.editingContract!.performsShiftWork).toBe(false);
      expect(checkbox.checked).toBe(false);
      expect(modalTexts('#contract-modal-shift-work-legend')).toEqual(['setting.contract.performsShiftWork-disabled']);
    });
  });

  describe('payment interval', () => {
    it('lists the intervals, shows the percent field for target hours and writes the percent', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      modalEl<HTMLButtonElement>('#contract-payment-interval-dropdown')!.click();
      await settle(fixture);

      expect(modalTexts('#contract-modal-payment-interval .dropdown-item')).toEqual([
        'de:settings.work.payment-weekly',
        'de:settings.work.payment-biweekly',
        'de:settings.work.payment-monthly',
        'de:settings.work.payment-individual',
        'de:settings.work.payment-monthly-target-hours',
      ]);
      expect(modalTexts('#contract-modal-payment-interval .dropdown-item.active')).toEqual([
        'de:settings.work.payment-monthly',
      ]);

      dropdownItem('contract-modal-payment-interval', 'de:settings.work.payment-monthly-target-hours').click();
      await settle(fixture);

      expect(parts.state.editingContract!.paymentInterval).toBe(PaymentInterval.MonthlyTargetHours);
      expect(modalTexts('#contract-payment-interval-dropdown .selector-name')).toEqual([
        'de:settings.work.payment-monthly-target-hours',
      ]);
      const percent = modalEl<HTMLInputElement>('#contract-percent')!;
      expect(percent.placeholder).toBe('setting.contract.percent-placeholder');

      typeInto(percent, '60');
      await settle(fixture);

      expect(parts.state.editingContract!.percent).toBe(60);
    });

    it('shows individual periods that arrive after the dialog opened and clears them on leaving', async () => {
      const { fixture, parts, contractService } = await setup({ contracts: [makeContract({ percent: 40 })] });
      await openEdit(fixture, 'c-1');

      modalEl<HTMLButtonElement>('#contract-payment-interval-dropdown')!.click();
      await settle(fixture);
      dropdownItem('contract-modal-payment-interval', 'de:settings.work.payment-individual').click();
      await settle(fixture);

      expect(parts.state.editingContract!.percent).toBeUndefined();
      expect(modalEl('#contract-modal-percent')).toBeNull();
      expect(modalTexts('#contract-modal-individual-period .dropdown-item')).toEqual([
        'setting.contract.noIndividualPeriod',
      ]);

      contractService.availableIndividualPeriods = [PERIOD_QUARTER];
      zoneTick();

      expect(modalTexts('#contract-modal-individual-period .dropdown-item')).toEqual([
        'setting.contract.noIndividualPeriod',
        'Quarter',
      ]);

      dropdownItem('contract-modal-individual-period', 'Quarter').click();
      await settle(fixture);

      expect(parts.state.editingContract!.individualPeriodId).toBe('p-1');
      expect(modalTexts('#contract-individual-period-dropdown .selector-name')).toEqual(['Quarter']);
      expect(modalTexts('#contract-modal-individual-period .dropdown-item.active')).toEqual(['Quarter']);

      dropdownItem('contract-modal-payment-interval', 'de:settings.work.payment-monthly').click();
      await settle(fixture);

      expect(parts.state.editingContract!.individualPeriodId).toBeUndefined();
      expect(modalEl('#contract-modal-individual-period')).toBeNull();
    });

    it('labels a stored individual period once the periods have loaded', async () => {
      const { fixture, contractService } = await setup({
        contracts: [makeContract({ paymentInterval: PaymentInterval.Individual, individualPeriodId: 'p-1' })],
      });
      await openEdit(fixture, 'c-1');

      expect(modalTexts('#contract-individual-period-dropdown .selector-name')).toEqual([
        'de:setting.contract.noIndividualPeriod',
      ]);

      contractService.availableIndividualPeriods = [PERIOD_QUARTER];
      zoneTick();

      expect(modalTexts('#contract-individual-period-dropdown .selector-name')).toEqual(['Quarter']);
    });

    it('relabels the interval after a language change', async () => {
      const { fixture, translate } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      translate.lang = 'en';
      translate.onLangChange.emit({ lang: 'en', translations: undefined });
      await settle(fixture);

      expect(modalTexts('#contract-payment-interval-dropdown .selector-name')).toEqual([
        'en:settings.work.payment-monthly',
      ]);
    });
  });

  describe('calendar and scheduling rule', () => {
    it('labels the stored calendar once the calendars have loaded and writes the selection', async () => {
      const { fixture, parts, contractService } = await setup({
        contracts: [makeContract({ calendarSelectionId: 'cal-2' })],
      });
      await openEdit(fixture, 'c-1');

      expect(modalTexts('#contract-calendar-dropdown .selector-name')).toEqual(['de:setting.contract.noCalendar']);

      contractService.availableCalendars = [CALENDAR_ONE, CALENDAR_TWO];
      zoneTick();

      expect(modalTexts('#contract-calendar-dropdown .selector-name')).toEqual(['Calendar 2']);
      expect(modalTexts('#contract-modal-calendar-section .dropdown-item')).toEqual([
        'setting.contract.noCalendar',
        'Calendar 1',
        'Calendar 2',
      ]);
      expect(modalTexts('#contract-modal-calendar-section .dropdown-item.active')).toEqual(['Calendar 2']);
      expect(modalEl('#contract-calendar-dropdown app-choose-calendar')).not.toBeNull();

      dropdownItem('contract-modal-calendar-section', 'Calendar 1').click();
      await settle(fixture);

      expect(parts.state.editingContract!.calendarSelectionId).toBe('cal-1');
      expect(parts.state.editingContract!.calendarSelection).toBe(CALENDAR_ONE);

      dropdownItem('contract-modal-calendar-section', 'setting.contract.noCalendar').click();
      await settle(fixture);

      expect(parts.state.editingContract!.calendarSelectionId).toBeUndefined();
      expect(parts.state.editingContract!.calendarSelection).toBeUndefined();
      expect(modalTexts('#contract-calendar-dropdown .selector-name')).toEqual(['de:setting.contract.noCalendar']);
    });

    it('keeps the rule of a deactivated industry selectable under its marked label', async () => {
      const { fixture, parts } = await setup({
        rules: [RULE_STANDARD],
        contracts: [makeContract({ schedulingRuleId: 'r-9' })],
      });
      await openEdit(fixture, 'c-1');

      const legacyLabel = 'de:setting.contract.schedulingRuleInactiveIndustry{"name":"Legacy"}';
      expect(modalTexts('#contract-scheduling-rule-dropdown .selector-name')).toEqual([legacyLabel]);
      expect(modalTexts('#contract-modal-scheduling-rule-section .dropdown-item')).toEqual([
        'setting.contract.noSchedulingRule',
        'Standard',
        legacyLabel,
      ]);

      dropdownItem('contract-modal-scheduling-rule-section', 'Standard').click();
      await settle(fixture);

      expect(parts.state.editingContract!.schedulingRuleId).toBe('r-1');
      expect(modalTexts('#contract-scheduling-rule-dropdown .selector-name')).toEqual(['Standard']);

      dropdownItem('contract-modal-scheduling-rule-section', 'setting.contract.noSchedulingRule').click();
      await settle(fixture);

      expect(parts.state.editingContract!.schedulingRuleId).toBeUndefined();
    });
  });

  describe('validity period', () => {
    it('the date inputs write the validity period to the contract', async () => {
      const { fixture, parts } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      componentOf<DateInputComponent>('#contract-modal-valid-from-input').valueChange.emit({
        year: 2025,
        month: 2,
        day: 3,
      });
      componentOf<DateInputComponent>('#contract-modal-valid-until-input').valueChange.emit({
        year: 2025,
        month: 12,
        day: 31,
      });
      await settle(fixture);

      expect(parts.state.editingContract!.validFrom.getFullYear()).toBe(2025);
      expect(parts.state.editingContract!.validUntil!.getMonth()).toBe(11);

      componentOf<DateInputComponent>('#contract-modal-valid-until-input').valueChange.emit(null);
      await settle(fixture);

      expect(parts.state.editingContract!.validUntil).toBeUndefined();
    });
  });

  describe('validation and save', () => {
    it('renders validation errors and keeps the dialog open on save', async () => {
      const { fixture, contractService } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      contractService.validateContract.mockReturnValue(['Name missing', 'Hours invalid']);
      zoneTick();

      expect(modalTexts('#contract-modal-validation-list li')).toEqual(['Name missing', 'Hours invalid']);

      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      await settle(fixture);

      expect(contractService.saveExistingContract).not.toHaveBeenCalled();
      expect(isModalOpen()).toBe(true);
    });

    it('saving an edited contract copies the debounced name onto the listed contract and closes', async () => {
      const listed = makeContract();
      const { fixture, parts, contractService } = await setup({ contracts: [listed] });
      const scroll = trackListScroll(fixture);
      await openEdit(fixture, 'c-1');

      typeInto(modalEl<HTMLInputElement>('#contractName')!, 'Renamed');
      await new Promise((resolve) => setTimeout(resolve, NAME_DEBOUNCE_WAIT_MS));
      await settle(fixture);
      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      await settle(fixture);

      expect(contractService.saveExistingContract).toHaveBeenCalledTimes(1);
      expect(contractService.saveExistingContract).toHaveBeenCalledWith(listed);
      expect(listed.name).toBe('Renamed');
      expect(parts.state.originalContract).toBe(listed);
      expect(contractService.contracts).toEqual([listed]);
      expect(isModalOpen()).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, SCROLL_WAIT_MS));
      expect(scroll.scrollTop).toBe(0);
    });

    it('saving a new contract appends it, adopts it as original and scrolls the list to the end', async () => {
      const created = makeContract({ id: undefined, name: 'Fresh' });
      const { fixture, parts, contractService } = await setup({ contracts: [makeContract()] });
      contractService.createContract.mockReturnValue(created);
      const scroll = trackListScroll(fixture);
      host(fixture).querySelector<HTMLElement>('#contracts-add-btn')!.click();
      await settle(fixture);

      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      await settle(fixture);

      expect(contractService.contracts).toHaveLength(2);
      expect(contractService.contracts[1]).toBe(created);
      expect(contractService.saveExistingContract).toHaveBeenCalledWith(created);
      expect(parts.state.originalContract).toBe(created);
      expect(parts.state.isNewContract).toBe(false);
      expect(isModalOpen()).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, SCROLL_WAIT_MS));
      expect(scroll.scrollTop).toBe(LIST_SCROLL_HEIGHT);
    });

    it('a failed save reloads the list and keeps the dialog open', async () => {
      const { fixture, contractService } = await setup({ contracts: [makeContract()] });
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      contractService.saveExistingContract.mockRejectedValue(new Error('boom'));
      await openEdit(fixture, 'c-1');

      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      await settle(fixture);

      expect(contractService.readContracts).toHaveBeenCalledTimes(1);
      expect(isModalOpen()).toBe(true);
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });

    it('ignores a second save click while the first save is running', async () => {
      const { fixture, contractService } = await setup({ contracts: [makeContract()] });
      let finish: (value: boolean) => void = () => undefined;
      contractService.saveExistingContract.mockReturnValue(
        new Promise<boolean>((resolve) => {
          finish = resolve;
        })
      );
      await openEdit(fixture, 'c-1');

      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      modalEl<HTMLButtonElement>('#contract-modal-save-btn')!.click();
      finish(true);
      await settle(fixture);

      expect(contractService.saveExistingContract).toHaveBeenCalledTimes(1);
      expect(isModalOpen()).toBe(false);
    });

    it('cancel and the close cross dismiss the dialog without saving', async () => {
      const { fixture, contractService } = await setup({ contracts: [makeContract()] });
      await openEdit(fixture, 'c-1');

      modalEl<HTMLElement>('#contract-modal-cancel-btn')!.click();
      await settle(fixture);
      expect(isModalOpen()).toBe(false);

      await openEdit(fixture, 'c-1');
      modalEl<HTMLElement>('#contract-modal-close-btn')!.click();
      await settle(fixture);

      expect(isModalOpen()).toBe(false);
      expect(contractService.saveExistingContract).not.toHaveBeenCalled();
    });
  });
});
