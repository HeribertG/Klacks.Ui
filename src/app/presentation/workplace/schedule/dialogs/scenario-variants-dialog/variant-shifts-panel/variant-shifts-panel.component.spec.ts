// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ComponentRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { VariantShiftsPanelComponent } from './variant-shifts-panel.component';
import { AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-status.enum';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';

const variant: IScenarioVariant = {
  id: 'variant-1',
  name: 'Winter key',
  groupId: 'group-1',
  fromDate: '2026-11-02',
  untilDate: '2026-11-29',
  token: 'variant-token-1',
  status: AnalyseScenarioStatus.Active,
  isExpired: false,
  shiftCount: 2,
};

function shift(overrides: Partial<IShift>): IShift {
  return {
    id: 'order-1',
    name: 'Night care',
    abbreviation: 'NC',
    startShift: '22:00:00',
    endShift: '06:00:00',
    status: ShiftStatus.SealedOrder,
    originalId: 'original-1',
    ...overrides,
  } as IShift;
}

describe('VariantShiftsPanelComponent', () => {
  let loadShifts: ReturnType<typeof vi.fn>;
  let deleteShift: ReturnType<typeof vi.fn>;
  let openModal: ReturnType<typeof vi.fn>;
  let fixture: ComponentFixture<VariantShiftsPanelComponent>;
  let componentRef: ComponentRef<VariantShiftsPanelComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const click = (selector: string): void => host().querySelector<HTMLElement>(selector)?.click();

  const render = (canEdit: boolean): void => {
    fixture = TestBed.createComponent(VariantShiftsPanelComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('variant', variant);
    componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
  };

  beforeEach(() => {
    loadShifts = vi.fn().mockReturnValue(
      of([
        shift({ id: 'order-1', name: 'Night care', originalId: 'original-1' }),
        shift({ id: 'copy-1', name: 'Night care copy', status: ShiftStatus.OriginalShift }),
        shift({ id: 'cut-1', name: 'Night care cut', status: ShiftStatus.SplitShift }),
      ]),
    );
    deleteShift = vi.fn().mockReturnValue(of(undefined));
    openModal = vi.fn();
    TestBed.configureTestingModule({
      imports: [VariantShiftsPanelComponent, TranslateModule.forRoot()],
      providers: [
        { provide: ScenarioVariantService, useValue: { loadShifts, deleteShift } },
        { provide: ModalService, useValue: { openModal } },
      ],
    });
  });

  it('loads the shifts of the key and lists only its orders, not the original copy or the cut pieces', () => {
    // Act
    render(true);

    // Assert
    expect(loadShifts).toHaveBeenCalledWith('variant-1');
    const rows = host().querySelectorAll('.shift-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Night care');
  });

  it('offers new, edit, cut and delete to a user who may edit', () => {
    // Act
    render(true);

    // Assert
    expect(host().querySelector('#variant-shifts-new-btn')).not.toBeNull();
    expect(host().querySelector('.shift-edit-btn')).not.toBeNull();
    expect(host().querySelector('.shift-cut-btn')).not.toBeNull();
    expect(host().querySelector('.shift-delete-btn')).not.toBeNull();
    expect(host().querySelector('#variant-shifts-readonly')).toBeNull();
  });

  it('shows the list read-only for a planner: no create, edit, cut or delete', () => {
    // Act
    render(false);

    // Assert
    expect(host().querySelectorAll('.shift-row')).toHaveLength(1);
    expect(host().querySelector('#variant-shifts-new-btn')).toBeNull();
    expect(host().querySelector('.shift-edit-btn')).toBeNull();
    expect(host().querySelector('.shift-cut-btn')).toBeNull();
    expect(host().querySelector('.shift-delete-btn')).toBeNull();
    expect(host().querySelector('#variant-shifts-readonly')).not.toBeNull();
  });

  it('reports the new-shift action', () => {
    // Arrange
    render(true);
    const emitted = vi.fn();
    fixture.componentInstance.newShift.subscribe(emitted);

    // Act
    click('#variant-shifts-new-btn');

    // Assert
    expect(emitted).toHaveBeenCalledTimes(1);
  });

  it('reports the order id for editing and for cutting', () => {
    // Arrange
    render(true);
    const edited = vi.fn();
    const cut = vi.fn();
    fixture.componentInstance.editShift.subscribe(edited);
    fixture.componentInstance.cutShift.subscribe(cut);

    // Act
    click('.shift-edit-btn');
    click('.shift-cut-btn');

    // Assert
    expect(edited).toHaveBeenCalledWith('order-1');
    expect(cut).toHaveBeenCalledWith('order-1');
  });

  it('asks before deleting and deletes only after the confirmation', () => {
    // Arrange
    render(true);

    // Act
    click('.shift-delete-btn');

    // Assert
    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal.mock.calls[0][0].type).toBe(ModalType.Delete);
    expect(deleteShift).not.toHaveBeenCalled();

    // Act
    openModal.mock.calls[0][0].onConfirm();

    // Assert
    expect(deleteShift).toHaveBeenCalledWith('variant-1', 'order-1');
    expect(loadShifts).toHaveBeenCalledTimes(2);
  });

  it('explains a refused delete in the panel', () => {
    // Arrange
    deleteShift.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'Locked' } })));
    render(true);
    click('.shift-delete-btn');

    // Act
    openModal.mock.calls[0][0].onConfirm();
    fixture.detectChanges();

    // Assert
    expect(host().querySelector('#variant-shifts-error')?.textContent).toContain('scenarioVariant.error.conflict');
  });

  it('shows a failed state when the shifts cannot be loaded', () => {
    // Arrange
    loadShifts.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    // Act
    render(true);

    // Assert
    expect(host().querySelector('#variant-shifts-failed')).not.toBeNull();
  });

  it('says so when the key holds no order yet', () => {
    // Arrange
    loadShifts.mockReturnValue(of([]));

    // Act
    render(true);

    // Assert
    expect(host().querySelector('#variant-shifts-empty')).not.toBeNull();
  });

  it('returns to the list of keys', () => {
    // Arrange
    render(true);
    const back = vi.fn();
    fixture.componentInstance.back.subscribe(back);

    // Act
    click('#variant-shifts-back-btn');

    // Assert
    expect(back).toHaveBeenCalledTimes(1);
  });
});
