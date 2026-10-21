// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Wizard entry of the schedule header: the auto-wizard button state, the admin-only Ctrl+Shift+H switch to the
 * dropdown with all wizards, and the permission checks for autofill and absence cover.
 * @param event - Document keydown that may carry the dropdown shortcut
 */
import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS, ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { AutofillRunPresenceService } from 'src/app/domain/services/schedule/autofill-run-presence.service';
import { AutoWizardOrchestratorService } from '../../services/auto-wizard-orchestrator.service';
import { ScheduleSelectionService } from '../../services/schedule-selection.service';
import {
  SCHEDULE_HEADER_TEXT_INPUT_TAGS,
  SCHEDULE_HEADER_WIZARD_DROPDOWN_SHORTCUT_KEY,
} from '../schedule-header.constants';

@Injectable()
export class ScheduleHeaderWizardMenuService {
  private authorizationService = inject(AuthorizationService);
  private autoWizardOrchestrator = inject(AutoWizardOrchestratorService);
  private autofillRunPresence = inject(AutofillRunPresenceService);
  private scheduleSelection = inject(ScheduleSelectionService);

  private readonly wizardDropdownMode = signal(false);
  readonly isWizardDropdownMode = this.wizardDropdownMode.asReadonly();
  readonly isAutoWizardRunningForCurrentGroup = this.autoWizardOrchestrator.isRunningForCurrentGroup;
  readonly isAutoWizardRunningForCurrentView = this.autofillRunPresence.isRunningForCurrentView;
  readonly isAutoWizardStartBlocked = this.autoWizardOrchestrator.isStartBlocked;
  readonly autoWizardBusyGroupName = this.autoWizardOrchestrator.busyGroupName;
  readonly isAutoWizardVisible = computed(
    () => this.autoWizardOrchestrator.isWorkloadEligible() || this.isAutoWizardStartBlocked(),
  );

  readonly canUseAutofill = computed(() => this.authorizationService.hasPermission(ROLE_ADMIN));

  /** Whoever may edit the schedule may ask for a cover proposal, independent of the admin-only wizard mode. */
  readonly canCoverAbsence = computed(
    () => this.authorizationService.hasPermission(PERMISSIONS.CanEditSchedule) && this.scheduleSelection.selectedWork() !== null,
  );

  async onAutoWizardClick(): Promise<void> {
    await this.autoWizardOrchestrator.start();
  }

  onShortcutKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey || !event.shiftKey || event.key.toLowerCase() !== SCHEDULE_HEADER_WIZARD_DROPDOWN_SHORTCUT_KEY) {
      return;
    }
    if (!this.authorizationService.hasPermission(ROLE_ADMIN)) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && (SCHEDULE_HEADER_TEXT_INPUT_TAGS.includes(target.tagName) || target.isContentEditable)) {
      return;
    }
    event.preventDefault();
    this.wizardDropdownMode.update((v) => !v);
  }
}
