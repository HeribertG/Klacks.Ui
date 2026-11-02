// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Panel inside the variants dialog that copies real shifts into a key, either the sealed orders the user ticks or all
 * sealed orders of one group (the key's group or one of its subgroups). A copy is a template for a new order and never
 * replaces the original, which stays untouched. A key that already holds shifts asks for confirmation first, because
 * copying the same group twice creates duplicates the server cannot detect. The outcome is reported in a toast with the
 * number of copied and skipped shift families.
 * @param variant - The key the shifts are copied into
 * @param back - Emits when the user returns to the list of keys
 * @param copied - Emits after a successful copy
 * @param mode - Whether single shifts are ticked or a whole group is copied; only one of the two is ever sent
 */

import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { formatTime } from 'src/app/domain/helpers/time-format.helper';
import { ICopyShiftsToVariantRequest } from 'src/app/domain/models/schedule/copy-shifts-to-variant-request.interface';
import { IScenarioVariantCopyResult } from 'src/app/domain/models/schedule/scenario-variant-copy-result.interface';
import { groupHierarchyIds } from 'src/app/domain/helpers/group-tree.helper';
import { SCENARIO_VARIANT_COPY_REFUSED_KEY } from 'src/app/domain/constants/scenario-variant.constants';
import { showScenarioVariantRefusal } from '../show-scenario-variant-refusal';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { ScenarioVariantService } from 'src/app/domain/services/schedule/scenario-variant.service';
import { ScenarioVariantSourceShiftService } from 'src/app/domain/services/schedule/scenario-variant-source-shift.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { IVariantCopyGroupOption } from './variant-copy-group-option.interface';

export const VARIANT_COPY_MODE = {
  Selection: 'selection',
  Group: 'group',
} as const;

export type VariantCopyMode = (typeof VARIANT_COPY_MODE)[keyof typeof VARIANT_COPY_MODE];

export const VARIANT_COPY_LOAD_STATE = {
  Loading: 'loading',
  Loaded: 'loaded',
  Failed: 'failed',
} as const;

export type VariantCopyLoadState = (typeof VARIANT_COPY_LOAD_STATE)[keyof typeof VARIANT_COPY_LOAD_STATE];

const COPY_RESULT_TOAST_NAME = 'scenario-variant-copy-result';
const TIME_RANGE_SEPARATOR = ' – ';

@Component({
  selector: 'app-variant-copy-panel',
  templateUrl: './variant-copy-panel.component.html',
  styleUrls: ['./variant-copy-panel.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantCopyPanelComponent implements OnInit {
  readonly variant = input.required<IScenarioVariant>();

  readonly back = output<void>();
  readonly copied = output<void>();

  private scenarioVariantService = inject(ScenarioVariantService);
  private sourceShiftService = inject(ScenarioVariantSourceShiftService);
  private groupService = inject(DataManagementGroupService);
  private modalService = inject(ModalService);
  private toastShowService = inject(ToastShowService);
  private translate = inject(TranslateService);

  readonly modes = VARIANT_COPY_MODE;
  readonly states = VARIANT_COPY_LOAD_STATE;
  readonly mode = signal<VariantCopyMode>(VARIANT_COPY_MODE.Selection);
  readonly candidates = signal<IShift[]>([]);
  readonly loadState = signal<VariantCopyLoadState>(VARIANT_COPY_LOAD_STATE.Loading);
  readonly selectedIds = signal<ReadonlySet<string>>(new Set<string>());
  readonly groupOptions = signal<IVariantCopyGroupOption[]>([]);
  readonly sourceGroupId = signal('');
  readonly isCopying = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly canCopy = computed(() => {
    if (this.isCopying()) return false;
    return this.mode() === VARIANT_COPY_MODE.Selection ? this.selectedIds().size > 0 : this.sourceGroupId() !== '';
  });

  ngOnInit(): void {
    this.sourceGroupId.set(this.variant().groupId);
    this.groupOptions.set(this.buildGroupOptions());
    this.loadCandidates();
  }

  timeRange(shift: IShift): string {
    return [shift.startShift, shift.endShift].map((time) => formatTime(time)).join(TIME_RANGE_SEPARATOR);
  }

  isSelected(shift: IShift): boolean {
    return !!shift.id && this.selectedIds().has(shift.id);
  }

  onToggle(shift: IShift): void {
    const id = shift.id;
    if (!id) return;

    this.selectedIds.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  }

  onCopy(): void {
    if (!this.canCopy()) return;

    const existing = this.variant().shiftCount;
    if (existing === 0) {
      this.copy();
      return;
    }

    this.modalService.openModal({
      type: ModalType.Confirmation,
      title: this.translate.instant('scenarioVariant.copy.title'),
      message: this.translate.instant('scenarioVariant.copy.confirmExisting', { count: existing }),
      confirmText: this.translate.instant('scenarioVariant.copy.start'),
      cancelText: this.translate.instant('cancel'),
      onConfirm: () => this.copy(),
    });
  }

  private copy(): void {
    this.errorMessage.set(null);
    this.isCopying.set(true);
    this.scenarioVariantService.copyShifts(this.variant().id, this.buildRequest()).subscribe({
      next: (result) => {
        this.isCopying.set(false);
        this.reportResult(result);
        this.copied.emit();
      },
      error: (err: unknown) => {
        this.isCopying.set(false);
        showScenarioVariantRefusal(err, this.translate, this.errorMessage, SCENARIO_VARIANT_COPY_REFUSED_KEY);
      },
    });
  }

  private buildRequest(): ICopyShiftsToVariantRequest {
    return this.mode() === VARIANT_COPY_MODE.Selection
      ? { shiftIds: [...this.selectedIds()] }
      : { sourceGroupId: this.sourceGroupId() };
  }

  private reportResult(result: IScenarioVariantCopyResult): void {
    this.toastShowService.showInfo(
      this.translate.instant('scenarioVariant.copy.result', {
        copied: result.copiedFamilies,
        skipped: result.skippedFamilies,
      }),
      COPY_RESULT_TOAST_NAME,
    );
  }

  private loadCandidates(): void {
    this.loadState.set(VARIANT_COPY_LOAD_STATE.Loading);
    this.sourceShiftService.loadSealedShifts(this.variant()).subscribe({
      next: (shifts) => {
        this.candidates.set(shifts);
        this.loadState.set(VARIANT_COPY_LOAD_STATE.Loaded);
      },
      error: () => this.loadState.set(VARIANT_COPY_LOAD_STATE.Failed),
    });
  }

  private buildGroupOptions(): IVariantCopyGroupOption[] {
    const groups = this.groupService.flatNodeList;
    const keyGroupId = this.variant().groupId;
    if (!groups.some((group) => group.id === keyGroupId)) {
      return [{ id: keyGroupId, name: this.translate.instant('scenarioVariant.copy.keyGroup') }];
    }

    const hierarchyIds = groupHierarchyIds(groups, keyGroupId);
    return groups.flatMap((group) => (group.id && hierarchyIds.includes(group.id) ? [{ id: group.id, name: group.name }] : []));
  }
}
