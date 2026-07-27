// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Dispatches context-menu clicks in the schedule section to the matching
 * action. Extracted from ScheduleSectionComponent to keep the menu
 * key -> handler table separate from component rendering concerns.
 *
 * @param cellManipulation - Service providing copy/paste/startEditing primitives
 * @param facade - Schedule-section facade exposing entryActions/dialog/navigation
 */
import { inject, Injectable } from '@angular/core';
import { BaseCellManipulationService } from 'src/app/presentation/shared/grid/services/body/cell-manipulation.service';
import {
  IScheduleCell,
  WorkScheduleEntryType,
} from 'src/app/domain/models/schedule/work-schedule-class';
import { ScheduleDataService } from './schedule-data.service';
import { ScheduleSectionFacadeService } from './schedule-section-facade.service';

export interface ScheduleMenuHost {
  readonly contextMenuRow: number;
  readonly contextMenuColumn: number;
  readonly contextMenuEntry: IScheduleCell | null | undefined;

  showSelectedShiftInShiftSection(): void;
  openContainerAt(
    row: number,
    column: number,
    entry: IScheduleCell | null | undefined,
  ): void;
  deleteBreakPlaceholder(): void;
  adoptBreakPlaceholder(absenceItemId?: string): void;
}

type MenuAction = (
  dataService: ScheduleDataService,
  keys: string[],
  host: ScheduleMenuHost,
) => void;

@Injectable()
export class ScheduleMenuDispatcherService {
  private readonly cellManipulation = inject(BaseCellManipulationService);
  private readonly facade = inject(ScheduleSectionFacadeService);

  dispatch(
    keys: string[],
    dataService: ScheduleDataService,
    host: ScheduleMenuHost,
  ): void {
    if (!keys || keys.length === 0) return;
    const action = this.actions[keys[0]];
    action?.(dataService, keys, host);
  }

  private readonly actions: Record<string, MenuAction> = {
    showInShift: (_d, _k, host) => host.showSelectedShiftInShiftSection(),
    copy: () => this.cellManipulation.copy(),
    cut: (dataService) => {
      this.cellManipulation.copy();
      this.facade.entryActions.deleteSelectedEntries(dataService);
    },
    paste: () => this.cellManipulation.paste(),
    del: (dataService) => this.facade.entryActions.deleteSelectedEntries(dataService),
    shift: (dataService, keys, host) =>
      this.facade.entryActions.addWorkFromShiftMenu(
        keys[1],
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
      ),
    absence: (dataService, keys, host) =>
      this.facade.entryActions.addBreakFromAbsenceMenu(
        keys[1],
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
      ),
    correction: (dataService, _k, host) =>
      this.facade.dialog.openCorrectionDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    travel: (dataService, _k, host) =>
      this.facade.dialog.openTravelDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    briefingDebriefing: (dataService, _k, host) =>
      this.facade.dialog.openBriefingDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    replacement: (dataService, _k, host) =>
      this.facade.dialog.openReplacementDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    splitContainer: (dataService, _k, host) =>
      this.facade.dialog.openContainerSplitDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    edit: (dataService, _k, host) => this.handleEdit(dataService, host),
    editWork: (dataService, _k, host) =>
      this.facade.dialog.openWorkEditDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    openContainer: (_d, _k, host) =>
      host.openContainerAt(
        host.contextMenuRow,
        host.contextMenuColumn,
        host.contextMenuEntry ?? undefined,
      ),
    expenses: (dataService, _k, host) =>
      this.facade.dialog.openExpensesDialog(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        host.contextMenuEntry ?? undefined,
      ),
    confirm: (dataService, _k, host) =>
      this.facade.entryActions.confirmWork(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
      ),
    unconfirm: (dataService, _k, host) =>
      this.facade.entryActions.unconfirmWork(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
      ),
    deleteBreakPlaceholder: (_d, _k, host) => host.deleteBreakPlaceholder(),
    adoptAbsence: (_d, keys, host) => host.adoptBreakPlaceholder(keys[1]),
  };

  private handleEdit(dataService: ScheduleDataService, host: ScheduleMenuHost): void {
    const fallbackEntry =
      host.contextMenuEntry !== undefined
        ? host.contextMenuEntry
        : dataService.getWorkScheduleEntryForCell(
            host.contextMenuRow,
            host.contextMenuColumn,
          );
    const isInlineEditable =
      fallbackEntry?.entryType === WorkScheduleEntryType.ScheduleNote ||
      fallbackEntry?.entryType === WorkScheduleEntryType.ScheduleCommand;

    if (isInlineEditable) {
      this.cellManipulation.startEditing();
    } else {
      this.facade.dialog.editWorkChange(
        host.contextMenuRow,
        host.contextMenuColumn,
        dataService,
        fallbackEntry ?? undefined,
      );
    }
  }
}
