// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Panel inside the variants dialog that lists the orders of one key and, for a user who may edit, offers to create a
 * new shift, open one for editing or cutting, or delete it from the key. Opening a shift only reports the id: the
 * dialog closes itself and navigates, so this panel never touches the router. The server returns the sealed orders of
 * the key; the original copy of an order and its cut pieces belong to the order and appear on the cut screen.
 * @param variant - The key whose shifts are listed
 * @param canEdit - Whether the user may create, edit, cut and delete (right to edit shifts and an active key)
 * @param newShift - Emits when the user wants to create a shift in the key
 * @param editShift - Emits the id of the order to edit
 * @param cutShift - Emits the id of the order, which the cut screen is opened with (the backend resolves its cuts)
 * @param back - Emits when the user returns to the list of keys
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { showScenarioVariantRefusal } from '../show-scenario-variant-refusal';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { ShiftStatus } from 'src/app/domain/models/shift/shift-status.enum';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';

export const VARIANT_SHIFTS_LOAD_STATE = {
  Loading: 'loading',
  Loaded: 'loaded',
  Failed: 'failed',
} as const;

export type VariantShiftsLoadState = (typeof VARIANT_SHIFTS_LOAD_STATE)[keyof typeof VARIANT_SHIFTS_LOAD_STATE];

const TIME_RANGE_SEPARATOR = ' – ';

@Component({
  selector: 'app-variant-shifts-panel',
  templateUrl: './variant-shifts-panel.component.html',
  styleUrls: ['./variant-shifts-panel.component.scss'],
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantShiftsPanelComponent implements OnInit {
  readonly variant = input.required<IScenarioVariant>();
  readonly canEdit = input(false);

  readonly newShift = output<void>();
  readonly editShift = output<string>();
  readonly cutShift = output<string>();
  readonly back = output<void>();

  private scenarioVariantService = inject(ScenarioVariantService);
  private modalService = inject(ModalService);
  private translate = inject(TranslateService);

  readonly shifts = signal<IShift[]>([]);
  readonly loadState = signal<VariantShiftsLoadState>(VARIANT_SHIFTS_LOAD_STATE.Loading);
  readonly errorMessage = signal<string | null>(null);
  readonly states = VARIANT_SHIFTS_LOAD_STATE;

  readonly orders = computed(() => this.shifts().filter((shift) => shift.status <= ShiftStatus.SealedOrder));

  ngOnInit(): void {
    this.load();
  }

  timeRange(shift: IShift): string {
    return [shift.startShift, shift.endShift].map((time) => formatTime(time)).join(TIME_RANGE_SEPARATOR);
  }

  onEdit(shift: IShift): void {
    if (shift.id) {
      this.editShift.emit(shift.id);
    }
  }

  onCut(shift: IShift): void {
    if (shift.id) {
      this.cutShift.emit(shift.id);
    }
  }

  onDelete(shift: IShift): void {
    if (!shift.id) return;

    const shiftId = shift.id;
    this.modalService.openModal({
      type: ModalType.Delete,
      title: this.translate.instant('scenarioVariant.shifts.delete'),
      message: this.translate.instant('scenarioVariant.shifts.deleteConfirm', { name: shift.name }),
      confirmText: this.translate.instant('scenarioVariant.shifts.delete'),
      cancelText: this.translate.instant('cancel'),
      onConfirm: () => this.delete(shiftId),
    });
  }

  private delete(shiftId: string): void {
    this.errorMessage.set(null);
    this.scenarioVariantService.deleteShift(this.variant().id, shiftId).subscribe({
      next: () => this.load(),
      error: (err: unknown) => showScenarioVariantRefusal(err, this.translate, this.errorMessage),
    });
  }

  private load(): void {
    this.loadState.set(VARIANT_SHIFTS_LOAD_STATE.Loading);
    this.scenarioVariantService.loadShifts(this.variant().id).subscribe({
      next: (shifts) => {
        this.shifts.set(shifts);
        this.loadState.set(VARIANT_SHIFTS_LOAD_STATE.Loaded);
      },
      error: (err: unknown) => {
        this.loadState.set(VARIANT_SHIFTS_LOAD_STATE.Failed);
        showScenarioVariantRefusal(err, this.translate, this.errorMessage);
      },
    });
  }
}
