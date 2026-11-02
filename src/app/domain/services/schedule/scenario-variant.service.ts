// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Domain service for variants (keys): named containers of not yet binding shifts for one group and period. Variant
 * mode is separate from scenario mode and never sets a scenario token: a shift edited in variant mode carries the
 * variant's token, a shift edited in scenario mode carries none.
 * Entering or leaving variant mode does not touch the active scenario. A caller that enters a variant while a
 * scenario is active must call AnalyseScenarioService.exitScenario() first; the other direction is covered there:
 * AnalyseScenarioService.selectScenario() and createScenario() end variant mode themselves, so the two modes are never
 * active together. Variant mode also ends on the end button of the mode bar, when another group is selected
 * (leaveIfGroupChanged) and when a shift screen loads a shift outside the variant (releaseWhenForeign); it stays on
 * across the schedule and the shift edit and cut screens, where the mode bar is shown.
 * The server answers a group with its subgroups, so the list of a group can hold keys of another group id; the list of the
 * group loaded before is dropped as soon as another group is requested and a late answer for it is ignored, so no reader
 * ever sees keys of another group.
 * @param variants - Variants of the group loaded last and of its subgroups
 * @param loadFailed - Whether the last list request failed
 * @param activeVariant - The variant being edited (or null); change it only through enter() and leave()
 * @param isVariantMode - Whether a variant is being edited
 * @param canManage - Whether the user may create, change and delete variants (right to edit shifts)
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { PERMISSION_CHECKER } from 'src/app/domain/interfaces/permission-checker.interface';
import { ICopyShiftsToVariantRequest } from 'src/app/domain/models/schedule/copy-shifts-to-variant-request.interface';
import { ICreateScenarioVariantRequest } from 'src/app/domain/models/schedule/create-scenario-variant-request.interface';
import { IScenarioVariant } from 'src/app/domain/models/schedule/scenario-variant.interface';
import { IScenarioVariantCopyResult } from 'src/app/domain/models/schedule/scenario-variant-copy-result.interface';
import { IUpdateScenarioVariantRequest } from 'src/app/domain/models/schedule/update-scenario-variant-request.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { DataScenarioVariantService } from 'src/app/infrastructure/api/schedule/data-scenario-variant.service';

@Injectable({
  providedIn: 'root',
})
export class ScenarioVariantService {
  private dataService = inject(DataScenarioVariantService);
  private permissionChecker = inject(PERMISSION_CHECKER);

  private _lastLoadedGroupId: string | undefined;
  private readonly _activeVariant = signal<IScenarioVariant | null>(null);

  public readonly variants = signal<IScenarioVariant[]>([]);
  public readonly loadFailed = signal(false);
  public readonly activeVariant = this._activeVariant.asReadonly();
  public readonly isVariantMode = computed(() => this._activeVariant() !== null);
  public readonly canManage = computed(() => this.permissionChecker.hasPermission(PERMISSIONS.CanEditShifts));

  loadVariants(groupId: string): void {
    if (groupId !== this._lastLoadedGroupId) {
      this.variants.set([]);
    }

    this._lastLoadedGroupId = groupId;
    this.loadFailed.set(false);
    this.dataService.getByGroup(groupId).subscribe({
      next: (variants) => {
        if (groupId === this._lastLoadedGroupId) {
          this.variants.set(variants);
          this.syncActiveVariant(groupId, variants);
        }
      },
      error: () => this.loadFailed.set(groupId === this._lastLoadedGroupId),
    });
  }

  enter(variant: IScenarioVariant): void {
    this._activeVariant.set(variant);
  }

  leave(): void {
    this._activeVariant.set(null);
  }

  /**
   * Ends variant mode when the selected group is neither the group of the variant being edited nor the group its list
   * was loaded for: a key of a subgroup is entered while the parent group stays selected.
   */
  leaveIfGroupChanged(selectedGroupId: string | undefined): void {
    const active = this._activeVariant();
    const isStillShown =
      selectedGroupId !== undefined && (selectedGroupId === active?.groupId || selectedGroupId === this._lastLoadedGroupId);
    if (active && !isStillShown) {
      this.leave();
    }
  }

  /** Whether the shift carries the token of the variant being edited, the one test of "this shift belongs to the key". */
  ownsShift(shift: { analyseToken?: string }): boolean {
    const token = this._activeVariant()?.token;
    return token !== undefined && shift.analyseToken === token;
  }

  /**
   * The one rule that keeps real shifts out of a variant: a shift screen that loaded existing shifts while variant mode
   * is on calls this with what it loaded. When any of them does not carry the active variant's token (a real shift, or a
   * shift of another variant) variant mode ends, so nothing opened afterwards can be stamped with the variant's token
   * (a cut of a real shift would otherwise become a variant row with a real parent). An empty list gives no verdict.
   * @returns True when variant mode was ended by this call
   */
  releaseWhenForeign(loaded: readonly { analyseToken?: string }[]): boolean {
    if (!this.isVariantMode() || loaded.every((shift) => this.ownsShift(shift))) {
      return false;
    }

    this.leave();
    return true;
  }

  create(request: ICreateScenarioVariantRequest): Observable<IScenarioVariant> {
    return this.dataService.create(request).pipe(tap((created) => this.upsert(created)));
  }

  update(id: string, request: IUpdateScenarioVariantRequest): Observable<IScenarioVariant> {
    return this.dataService.update(id, request).pipe(tap((updated) => this.upsert(updated)));
  }

  remove(id: string): Observable<void> {
    return this.dataService.delete(id).pipe(
      tap(() => {
        this.variants.update((list) => list.filter((variant) => variant.id !== id));
        if (this._activeVariant()?.id === id) {
          this.leave();
        }
      }),
    );
  }

  deleteShift(id: string, shiftId: string): Observable<void> {
    return this.dataService.deleteShift(id, shiftId).pipe(tap(() => this.reload()));
  }

  copyShifts(id: string, request: ICopyShiftsToVariantRequest): Observable<IScenarioVariantCopyResult> {
    return this.dataService.copyShifts(id, request).pipe(tap(() => this.reload()));
  }

  loadShifts(id: string): Observable<IShift[]> {
    return this.dataService.getShifts(id);
  }

  private reload(): void {
    if (this._lastLoadedGroupId) {
      this.loadVariants(this._lastLoadedGroupId);
    }
  }

  private upsert(variant: IScenarioVariant): void {
    this.variants.update((list) =>
      list.some((entry) => entry.id === variant.id)
        ? list.map((entry) => (entry.id === variant.id ? variant : entry))
        : [...list, variant],
    );
    if (this._activeVariant()?.id === variant.id) {
      this._activeVariant.set(variant);
    }
  }

  private syncActiveVariant(groupId: string, loaded: IScenarioVariant[]): void {
    const active = this._activeVariant();
    if (!active) {
      return;
    }

    const fresh = loaded.find((variant) => variant.id === active.id);
    if (fresh) {
      this._activeVariant.set(fresh);
    } else if (active.groupId === groupId) {
      this.leave();
    }
  }
}
