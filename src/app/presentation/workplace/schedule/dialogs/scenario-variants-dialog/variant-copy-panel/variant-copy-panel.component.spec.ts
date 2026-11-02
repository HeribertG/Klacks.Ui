// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { VariantCopyPanelComponent } from './variant-copy-panel.component';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { ScenarioVariantSourceShiftService } from 'src/app/domain/services/schedule/scenario-variant-source-shift.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

const emptyVariant: IScenarioVariant = {
  id: 'variant-1',
  name: 'Winter key',
  groupId: 'group-1',
  fromDate: '2026-11-02',
  untilDate: '2026-11-29',
  token: 'variant-token-1',
  status: AnalyseScenarioStatus.Active,
  isExpired: false,
  shiftCount: 0,
};

const groups = [
  { id: 'root', name: 'Company' },
  { id: 'group-1', name: 'Hospital', parent: 'root' },
  { id: 'group-1-a', name: 'Ward A', parent: 'group-1' },
  { id: 'group-2', name: 'Other site', parent: 'root' },
];

const candidates = [
  { id: 'order-1', name: 'Night care', abbreviation: 'NC', startShift: '22:00:00', endShift: '06:00:00' },
  { id: 'order-2', name: 'Day care', abbreviation: 'DC', startShift: '07:00:00', endShift: '15:00:00' },
] as IShift[];

describe('VariantCopyPanelComponent', () => {
  let copyShifts: ReturnType<typeof vi.fn>;
  let loadSealedShifts: ReturnType<typeof vi.fn>;
  let openModal: ReturnType<typeof vi.fn>;
  let showInfo: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<VariantCopyPanelComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const click = (selector: string): void => {
    host().querySelector<HTMLElement>(selector)?.click();
    fixture.detectChanges();
  };
  const tick = (): void => fixture.detectChanges();

  const render = (variant: IScenarioVariant = emptyVariant): void => {
    fixture = TestBed.createComponent(VariantCopyPanelComponent);
    fixture.componentRef.setInput('variant', variant);
    fixture.detectChanges();
  };

  const tickShift = (id: string): void => {
    const checkbox = host().querySelector<HTMLInputElement>(`[data-shift-id="${id}"] input`);
    checkbox?.click();
    tick();
  };

  beforeEach(() => {
    copyShifts = vi.fn().mockReturnValue(of({ copiedFamilies: 2, skippedFamilies: 1 }));
    loadSealedShifts = vi.fn().mockReturnValue(of(candidates));
    openModal = vi.fn();
    showInfo = vi.fn();
    TestBed.configureTestingModule({
      imports: [VariantCopyPanelComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ScenarioVariantService, useValue: { copyShifts } },
        { provide: ScenarioVariantSourceShiftService, useValue: { loadSealedShifts } },
        { provide: DataManagementGroupService, useValue: { flatNodeList: groups } },
        { provide: ModalService, useValue: { openModal } },
        { provide: ToastShowService, useValue: { showInfo } },
      ],
    });
  });

  it('warns that a copy is a template for a new order and never replaces the original', () => {
    // Act
    render();

    // Assert
    expect(host().querySelector('#variant-copy-warning')?.textContent).toContain('scenarioVariant.copy.warning');
  });

  it('offers the sealed orders of the key for ticking and disables copying until one is ticked', () => {
    // Act
    render();

    // Assert
    expect(loadSealedShifts).toHaveBeenCalledWith(emptyVariant);
    expect(host().querySelectorAll('.candidate-row')).toHaveLength(2);
    expect(host().querySelector<HTMLButtonElement>('#variant-copy-start-btn')?.disabled).toBe(true);
  });

  it('sends only the ticked shift ids, reports copied and skipped in a toast and tells the dialog', () => {
    // Arrange
    render();
    const copied = vi.fn();
    fixture.componentInstance.copied.subscribe(copied);
    tickShift('order-1');
    tickShift('order-2');
    tickShift('order-2');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(copyShifts).toHaveBeenCalledWith('variant-1', { shiftIds: ['order-1'] });
    expect(showInfo).toHaveBeenCalledTimes(1);
    expect(copied).toHaveBeenCalledTimes(1);
  });

  it('passes the numbers of copied and skipped families to the result text', () => {
    // Arrange
    const translate = TestBed.inject(TranslateService);
    const instant = vi.spyOn(translate, 'instant');
    render();
    tickShift('order-1');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(instant).toHaveBeenCalledWith('scenarioVariant.copy.result', { copied: 2, skipped: 1 });
  });

  it('copies a whole group by its id and sends no shift ids', () => {
    // Arrange
    render();
    click('#variant-copy-mode-group');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(copyShifts).toHaveBeenCalledWith('variant-1', { sourceGroupId: 'group-1' });
  });

  it('offers the key group and its subgroups for the group copy, nothing outside', () => {
    // Arrange
    render();

    // Act
    click('#variant-copy-mode-group');

    // Assert
    const options = Array.from(host().querySelectorAll('#variant-copy-group-select option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Hospital', 'Ward A']);
  });

  it('asks for confirmation before copying into a key that already holds shifts', () => {
    // Arrange
    render({ ...emptyVariant, shiftCount: 3 });
    tickShift('order-1');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal.mock.calls[0][0].type).toBe(ModalType.Confirmation);
    expect(copyShifts).not.toHaveBeenCalled();

    // Act
    openModal.mock.calls[0][0].onConfirm();

    // Assert
    expect(copyShifts).toHaveBeenCalledWith('variant-1', { shiftIds: ['order-1'] });
  });

  it('does not ask when the key is still empty', () => {
    // Arrange
    render();
    tickShift('order-1');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(openModal).not.toHaveBeenCalled();
  });

  it('explains a refused copy in the panel and does not report success', () => {
    // Arrange
    copyShifts.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail: 'Group not allowed' } })));
    render();
    const copied = vi.fn();
    fixture.componentInstance.copied.subscribe(copied);
    tickShift('order-1');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(host().querySelector('#variant-copy-error')?.textContent).toContain('scenarioVariant.copy.refused');
    expect(showInfo).not.toHaveBeenCalled();
    expect(copied).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing customer', 'A shift in a variant needs a customer'],
    ['no plannable part in the period', "The shift has no plannable part inside the variant's period, or a part inside it hangs on a part outside it"],
  ])('keeps the ticked shifts on %s and never shows the English text', (_case, detail) => {
    // Arrange
    copyShifts.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400, error: { detail } })));
    render();
    tickShift('order-1');

    // Act
    click('#variant-copy-start-btn');
    fixture.detectChanges();

    // Assert
    expect(host().querySelector('#variant-copy-error')?.textContent).not.toContain(detail);
    expect(fixture.componentInstance.selectedIds().has('order-1')).toBe(true);
    expect(fixture.componentInstance.canCopy()).toBe(true);
  });

  it('keeps the explanation of a coded conflict in the panel', () => {
    // Arrange
    copyShifts.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { errorCode: 'SCENARIO_VARIANT_IN_USE' } })),
    );
    render();
    tickShift('order-1');

    // Act
    click('#variant-copy-start-btn');

    // Assert
    expect(host().querySelector('#variant-copy-error')?.textContent).toContain('scenarioVariant.error.inUse');
  });

  it('shows a failed state when the shifts cannot be loaded', () => {
    // Arrange
    loadSealedShifts.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    // Act
    render();

    // Assert
    expect(host().querySelector('#variant-copy-load-failed')).not.toBeNull();
  });

  it('returns to the list of keys', () => {
    // Arrange
    render();
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);

    // Act
    click('#variant-copy-back-btn');

    // Assert
    expect(back).toHaveBeenCalledTimes(1);
  });
});
