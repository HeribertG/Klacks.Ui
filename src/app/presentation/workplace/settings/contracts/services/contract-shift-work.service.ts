// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tri-state shift-work flag of the contract dialog: standard (null), yes and no.
 * @param target - The checkbox that was clicked, if any
 */

import { inject, Injectable } from '@angular/core';

import { SHIFT_WORK_TOOLTIP_KEYS } from '../contracts.constants';
import { ContractEditorStateService } from './contract-editor-state.service';

@Injectable()
export class ContractShiftWorkService {
  private readonly state = inject(ContractEditorStateService);

  isShiftWorkChecked(): boolean {
    return this.state.performsShiftWork() === true;
  }

  isShiftWorkUnset(): boolean {
    return this.state.performsShiftWork() == null;
  }

  shiftWorkTooltipKey(): string {
    const keys = SHIFT_WORK_TOOLTIP_KEYS;
    if (this.isShiftWorkUnset()) {
      return keys.unset;
    }
    return this.isShiftWorkChecked() ? keys.enabled : keys.disabled;
  }

  /**
   * Cycles the contract's shift-work flag through standard (null), yes and no. The DOM checkbox is
   * re-synchronised because a native click always toggles `checked` and clears `indeterminate`.
   * @param target - The checkbox that was clicked, if any
   */
  cycleShiftWork(target?: EventTarget | null): void {
    const current = this.state.performsShiftWork();
    const next = current == null ? true : current ? false : null;
    this.state.performsShiftWork.set(next);
    if (this.state.editingContract) {
      this.state.editingContract.performsShiftWork = next;
    }

    const checkbox = target as HTMLInputElement | null;
    if (!checkbox) {
      return;
    }

    const applyDomState = (): void => {
      checkbox.checked = next === true;
      checkbox.indeterminate = next == null;
    };

    applyDomState();
    queueMicrotask(applyDomState);
  }
}
