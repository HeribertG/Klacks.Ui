// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplicationRef, Component, EmbeddedViewRef, signal, ViewContainerRef } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject } from 'rxjs';

import { SchedulingRulesComponent } from './scheduling-rules.component';
import { DataManagementSchedulingRuleService } from 'src/app/domain/services/scheduling/data-management-scheduling-rule.service';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { ManualLoaderService } from 'src/app/application/services/manual-loader.service';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { SchedulingRule } from 'src/app/domain/models/scheduling/scheduling-rule.model';

describe('SchedulingRulesComponent tri-state weekday flags', () => {
  let component: SchedulingRulesComponent;
  let fixture: ComponentFixture<SchedulingRulesComponent>;

  beforeEach(async () => {
    const mockDataManagement = {
      init: vi.fn().mockResolvedValue(undefined),
      readRules: vi.fn().mockResolvedValue(undefined),
      isRead: signal(false),
      rules: [],
      createRule: vi.fn(() => new SchedulingRule()),
      validateRule: vi.fn(() => []),
      saveExistingRule: vi.fn().mockResolvedValue(true),
      deleteRule: vi.fn().mockResolvedValue(true),
      showProgressSpinner: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [SchedulingRulesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementSchedulingRuleService, useValue: mockDataManagement },
        { provide: NgbModal, useValue: { open: vi.fn() } },
        { provide: ModalService, useValue: { componentContext: '', Filing: '', deleteMessage: '', resultEvent: new Subject<ModalType>(), setDefault: vi.fn(), openModel: vi.fn() } },
        { provide: ManualLoaderService, useValue: { loadManual: vi.fn(() => of('')) } },
        { provide: DataRefreshRegistry, useValue: { register: vi.fn(() => () => undefined) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulingRulesComponent);
    component = fixture.componentInstance;
    component.editingRule = new SchedulingRule();
  });

  it('starts unset when the rule prescribes nothing', () => {
    expect(component.isTriStateUnset('workOnMonday')).toBe(true);
    expect(component.isTriStateChecked('workOnMonday')).toBe(false);
  });

  it('cycles unset to true, true to false and false back to unset', () => {
    component.cycleTriState('workOnMonday');
    expect(component.editingRule!.workOnMonday).toBe(true);

    component.cycleTriState('workOnMonday');
    expect(component.editingRule!.workOnMonday).toBe(false);

    component.cycleTriState('workOnMonday');
    expect(component.editingRule!.workOnMonday).toBeNull();
  });

  it('reports the state flags for each step of the cycle', () => {
    component.cycleTriState('workOnSaturday');
    expect(component.isTriStateChecked('workOnSaturday')).toBe(true);
    expect(component.isTriStateUnset('workOnSaturday')).toBe(false);

    component.cycleTriState('workOnSaturday');
    expect(component.isTriStateChecked('workOnSaturday')).toBe(false);
    expect(component.isTriStateUnset('workOnSaturday')).toBe(false);

    component.cycleTriState('workOnSaturday');
    expect(component.isTriStateUnset('workOnSaturday')).toBe(true);
  });

  it('cycles performsShiftWork with the same three states', () => {
    expect(component.isTriStateUnset(component.shiftWorkField)).toBe(true);

    component.cycleTriState(component.shiftWorkField);
    expect(component.editingRule!.performsShiftWork).toBe(true);

    component.cycleTriState(component.shiftWorkField);
    expect(component.editingRule!.performsShiftWork).toBe(false);

    component.cycleTriState(component.shiftWorkField);
    expect(component.editingRule!.performsShiftWork).toBeNull();
  });

  it('leaves the other days untouched when one day is cycled', () => {
    component.cycleTriState('workOnMonday');

    expect(component.editingRule!.workOnTuesday).toBeNull();
    expect(component.editingRule!.workOnSunday).toBeNull();
  });

  it('does nothing when no rule is being edited', () => {
    component.editingRule = null;

    expect(() => component.cycleTriState('workOnMonday')).not.toThrow();
    expect(component.isTriStateUnset('workOnMonday')).toBe(true);
    expect(component.isTriStateChecked('workOnMonday')).toBe(false);
  });

  it('offers a tooltip key per state', () => {
    expect(component.triStateTooltipKey('workOnMonday')).toBe('setting.schedulingRule.triState-unset');

    component.cycleTriState('workOnMonday');
    expect(component.triStateTooltipKey('workOnMonday')).toBe('setting.schedulingRule.triState-enabled');

    component.cycleTriState('workOnMonday');
    expect(component.triStateTooltipKey('workOnMonday')).toBe('setting.schedulingRule.triState-disabled');
  });

  it('exposes all seven weekdays in order', () => {
    expect(component.workDayOptions.map(o => o.field)).toEqual([
      'workOnMonday',
      'workOnTuesday',
      'workOnWednesday',
      'workOnThursday',
      'workOnFriday',
      'workOnSaturday',
      'workOnSunday',
    ]);
  });

  it('keeps unset numeric fields null across open and save', () => {
    const rule = new SchedulingRule();
    component.editingRule = rule;

    component['initFormSignals'](rule);
    component['applySignalsToRule']();

    expect(rule.maxWorkDays).toBeNull();
    expect(rule.defaultWorkingHours).toBeNull();
    expect(rule.fullTimeHours).toBeNull();
    expect(rule.overtimeThreshold).toBeNull();
    expect(rule.guaranteedHours).toBeNull();
    expect(rule.vacationDaysPerYear).toBeNull();
  });

  it('keeps prescribed numeric values untouched across open and save', () => {
    const rule = new SchedulingRule();
    rule.maxDailyHours = 10;
    rule.maxConsecutiveDays = 6;
    rule.minRestDays = 1;
    component.editingRule = rule;

    component['initFormSignals'](rule);
    component['applySignalsToRule']();

    expect(rule.maxDailyHours).toBe(10);
    expect(rule.maxConsecutiveDays).toBe(6);
    expect(rule.minRestDays).toBe(1);
    expect(rule.maxWorkDays).toBeNull();
  });

  it('keeps an explicit zero rate as zero, not as unset', () => {
    const rule = new SchedulingRule();
    rule.we1Rate = 0;
    rule.nightRate = 0;
    component.editingRule = rule;

    component['initFormSignals'](rule);
    component['applySignalsToRule']();

    expect(rule.we1Rate).toBe(0);
    expect(rule.nightRate).toBe(0);
  });

  it('keeps unset time-of-day fields null across open and save', () => {
    const rule = new SchedulingRule();
    component.editingRule = rule;

    component['initFormSignals'](rule);
    component['applySignalsToRule']();

    expect(rule.nightStart).toBeNull();
    expect(rule.nightEnd).toBeNull();
  });

  describe('rendered in the modal template', () => {
    let monday: HTMLInputElement;
    let modalView: EmbeddedViewRef<unknown>;

    const queryModal = <T extends Element>(selector: string): T | null => {
      for (const node of modalView.rootNodes as Element[]) {
        if (typeof node.querySelector !== 'function') continue;
        if (node.matches?.(selector)) return node as unknown as T;
        const hit = node.querySelector(selector);
        if (hit) return hit as T;
      }
      return null;
    };

    beforeEach(() => {
      fixture.detectChanges();
      const viewContainer = fixture.debugElement.injector.get(ViewContainerRef);
      modalView = viewContainer.createEmbeddedView(component.ruleModal(), {
        $implicit: { close: () => undefined, dismiss: () => undefined },
      });
      fixture.detectChanges();
      monday = queryModal<HTMLInputElement>('#scheduling-rule-modal-workOnMonday')!;
    });

    afterEach(() => modalView.destroy());

    it('shows an unset day as indeterminate rather than unchecked', () => {
      expect(monday).toBeTruthy();
      expect(monday.indeterminate).toBe(true);
      expect(monday.checked).toBe(false);
    });

    it('invokes the cycle handler exactly once per click', () => {
      const spy = vi.spyOn(component, 'cycleTriState');

      monday.click();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('advances exactly one step per click on the checkbox', () => {
      monday.click();
      fixture.detectChanges();
      expect(component.editingRule!.workOnMonday).toBe(true);
      expect(monday.checked).toBe(true);
      expect(monday.indeterminate).toBe(false);

      monday.click();
      fixture.detectChanges();
      expect(component.editingRule!.workOnMonday).toBe(false);
      expect(monday.checked).toBe(false);
      expect(monday.indeterminate).toBe(false);

      monday.click();
      fixture.detectChanges();
      expect(component.editingRule!.workOnMonday).toBeNull();
      expect(monday.indeterminate).toBe(true);
    });

    it('advances exactly one step per click on the surrounding label', () => {
      const label = monday.closest('label') as HTMLLabelElement;

      label.click();
      fixture.detectChanges();

      expect(component.editingRule!.workOnMonday).toBe(true);
      expect(monday.checked).toBe(true);
    });

    it('re-syncs the checkbox when the browser toggled it despite preventDefault', () => {
      monday.checked = true;
      monday.indeterminate = false;
      component.cycleTriState('workOnMonday', monday);

      expect(component.editingRule!.workOnMonday).toBe(true);
      expect(monday.checked).toBe(true);
      expect(monday.indeterminate).toBe(false);

      monday.checked = false;
      component.cycleTriState('workOnMonday', monday);

      expect(component.editingRule!.workOnMonday).toBe(false);
      expect(monday.checked).toBe(false);
      expect(monday.indeterminate).toBe(false);

      monday.checked = true;
      component.cycleTriState('workOnMonday', monday);

      expect(component.editingRule!.workOnMonday).toBeNull();
      expect(monday.checked).toBe(false);
      expect(monday.indeterminate).toBe(true);
    });

    it('renders a null numeric field as an empty input', () => {
      component['initFormSignals'](component.editingRule!);
      fixture.detectChanges();

      const maxWorkDays = queryModal<HTMLInputElement>('#maxWorkDays')!;
      expect(maxWorkDays.value).toBe('');
    });
  });
});

@Component({
  standalone: true,
  imports: [FormField],
  template: '<input type="number" id="probe" [formField]="probeForm.value" />',
})
class NullableNumberProbeComponent {
  readonly model = signal<{ value: number | null }>({ value: null });
  readonly probeForm = form(this.model);
}

describe('signal forms with a nullable number field', () => {
  let fixture: ComponentFixture<NullableNumberProbeComponent>;
  let probe: NullableNumberProbeComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [NullableNumberProbeComponent] }).compileComponents();
    fixture = TestBed.createComponent(NullableNumberProbeComponent);
    probe = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders a null value as an empty input, not as zero', () => {
    const input = fixture.nativeElement.querySelector('#probe') as HTMLInputElement;

    expect(input.value).toBe('');
  });

  it('reads an emptied input back as null', () => {
    probe.model.set({ value: 5 });
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#probe') as HTMLInputElement;
    expect(input.value).toBe('5');

    input.value = '';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(probe.model().value).toBeNull();
  });

  it('keeps an explicit zero as zero', () => {
    const input = fixture.nativeElement.querySelector('#probe') as HTMLInputElement;

    input.value = '0';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(probe.model().value).toBe(0);
  });
});

describe('SchedulingRulesComponent opened through the real NgbModal', () => {
  let component: SchedulingRulesComponent;
  let fixture: ComponentFixture<SchedulingRulesComponent>;

  beforeEach(async () => {
    const mockDataManagement = {
      init: vi.fn().mockResolvedValue(undefined),
      readRules: vi.fn().mockResolvedValue(undefined),
      isRead: signal(false),
      rules: [],
      createRule: vi.fn(() => new SchedulingRule()),
      validateRule: vi.fn(() => []),
      saveExistingRule: vi.fn().mockResolvedValue(true),
      deleteRule: vi.fn().mockResolvedValue(true),
      showProgressSpinner: signal(false),
    };

    await TestBed.configureTestingModule({
      imports: [SchedulingRulesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementSchedulingRuleService, useValue: mockDataManagement },
        { provide: ModalService, useValue: { componentContext: '', Filing: '', deleteMessage: '', resultEvent: new Subject<ModalType>(), setDefault: vi.fn(), openModel: vi.fn() } },
        { provide: ManualLoaderService, useValue: { loadManual: vi.fn(() => of('')) } },
        { provide: DataRefreshRegistry, useValue: { register: vi.fn(() => () => undefined) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulingRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(async () => {
    TestBed.inject(NgbModal).dismissAll();
    await new Promise(resolve => setTimeout(resolve, 20));
    TestBed.inject(ApplicationRef).tick();
  });

  const queryOpenModal = <T extends Element>(selector: string): T =>
    Array.from(document.querySelectorAll(selector)).pop() as T;

  const openModalFor = async (rule: SchedulingRule): Promise<void> => {
    component.onClickEdit(rule);
    await new Promise(resolve => setTimeout(resolve, 20));
    TestBed.inject(ApplicationRef).tick();
  };

  it('cycles a weekday when the checkbox is clicked inside the real modal', async () => {
    await openModalFor(new SchedulingRule());

    const monday = queryOpenModal<HTMLInputElement>('#scheduling-rule-modal-workOnMonday');
    expect(monday).toBeTruthy();
    expect(monday.indeterminate).toBe(true);

    monday.click();
    TestBed.inject(ApplicationRef).tick();

    expect(component.editingRule!.workOnMonday).toBe(true);
    expect(monday.checked).toBe(true);
    expect(monday.indeterminate).toBe(false);
  });

  it('cycles performsShiftWork when clicked inside the real modal', async () => {
    await openModalFor(new SchedulingRule());

    const shiftWork = queryOpenModal<HTMLInputElement>('#scheduling-rule-modal-performs-shift-work');
    expect(shiftWork).toBeTruthy();

    shiftWork.click();
    TestBed.inject(ApplicationRef).tick();

    expect(component.editingRule!.performsShiftWork).toBe(true);
    expect(shiftWork.checked).toBe(true);
  });
});
