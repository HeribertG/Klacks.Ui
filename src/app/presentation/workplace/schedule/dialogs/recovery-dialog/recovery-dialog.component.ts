// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Dialog for the reactive recovery flow. The dispatcher marks an employee absent - a single day or a
 * range - with an absence type; the deterministic recovery engine proposes a rule-compliant replacement as
 * an isolated, propose-only scenario. The dialog then shows WHAT was proposed instead of a toast with two
 * numbers: which slot got whom, how far the engine had to search, what stayed open and why. The dialog
 * never accepts the scenario; a person decides. It opens either from the toolbar or, pre-filled with the
 * employee and day, from a right-click on a work cell or an employee row (RecoveryDialogLauncherService).
 * In the review step the planner calls the proposed stand-in and records the response (Ablösung/Einsprung
 * request book); alternatives per slot can be listed and their contact attempts recorded as well, without
 * changing the proposal.
 * @param clients - Visible schedule employees, used to show the name of the preselected absent employee
 * @param absences - Absence types (sick/vacation/...) loaded from the catalog
 * @param slotOutcomes - Saved responses of the proposed stand-ins, keyed by replacement-request id
 * @param alternatives - Loaded alternative stand-ins per covered slot
 * @param alternativeOutcomes - Recorded contact attempts on alternatives, keyed by slot and candidate
 * @param storedRequests - Request rows stored for the reviewed scenario, keyed by slot and candidate; local
 *   responses of this session always win over them
 */
import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LocalizedParamsPipe } from 'src/app/shared/pipes/localized-params/localized-params.pipe';
import { CalendarDatePipe } from 'src/app/shared/pipes/calendar-date/calendar-date.pipe';
import { firstValueFrom } from 'rxjs';
import {
  DataRecoveryService,
  ICoverAbsenceOutcome,
  ICoveredSlot,
} from 'src/app/infrastructure/api/schedule/data-recovery.service';
import { ReplacementRequestOutcome } from 'src/app/domain/enums/replacement-request-outcome.enum';
import { IReplacementCandidate } from 'src/app/domain/interfaces/replacement-candidate.interface';
import { IReplacementRequest } from 'src/app/domain/interfaces/replacement-request.interface';
import { isReplacementRequestApplied } from 'src/app/domain/helpers/replacement-request-applied.helper';
import { formatTime } from 'src/app/shared/helpers/time-format.helper';
import { RecoveryOutcomeButtonsComponent } from './recovery-outcome-buttons/recovery-outcome-buttons.component';
import { RecoveryAlternativesStatus } from './recovery-alternatives-status.enum';
import { IRecoveryAlternativesState } from './recovery-alternatives-state.interface';
import { AnalyseScenarioService } from 'src/app/domain/services/schedule/analyse-scenario.service';
import { DataManagementScheduleService } from 'src/app/domain/services/schedule/data-management-schedule.service';
import { AbsenceLookupService } from 'src/app/domain/services/schedule/absence-lookup.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { IClientWork } from 'src/app/domain/models/schedule/schedule-class';
import { IAbsence } from 'src/app/domain/models/absence/absence-class';
import { IAnalyseScenario, AnalyseScenarioStatus } from 'src/app/domain/models/schedule/analyse-scenario-class';
import { companyToday, formatDateOnly, isSameCalendarDate } from 'src/app/shared/helpers/calendar-date.helper';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN, ROLE_AUTHORISED } from 'src/app/domain/constants/permissions.constants';
import {
  IRecoveryDialogPreset,
  RecoveryDialogLauncherService,
} from '../../services/recovery-dialog-launcher.service';

const RECOVERY_CREATOR = 'recovery';
const KEY_SEPARATOR = '|';
const TEL_SCHEME = 'tel:';
const PHONE_WHITESPACE = /\s+/g;
const OUTCOME_STATE_KEY_PREFIX = 'recovery.dialog.outcomeState.';
const ALTERNATIVES_LOADING: IRecoveryAlternativesState = {
  status: RecoveryAlternativesStatus.Loading,
  candidates: [],
};

/** What the review step was computed for, so later calls do not read a form the planner may have edited. */
interface IRecoverySubmission {
  absentClientId: string;
  absenceId: string;
  groupId: string;
  overrideBlock: boolean;
}

interface IRecoveryFormModel {
  selectedClientId: string;
  selectedAbsenceId: string;
  selectedDate: string;
  selectedUntilDate: string;
  overrideBlock: boolean;
  notifyEscalationRoster: boolean;
}

@Component({
  selector: 'app-recovery-dialog',
  templateUrl: './recovery-dialog.component.html',
  styleUrls: ['./recovery-dialog.component.scss'],
  standalone: true,
  imports: [FormField, TranslateModule, LocalizedParamsPipe, CalendarDatePipe, RecoveryOutcomeButtonsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AbsenceLookupService],
})
export class RecoveryDialogComponent {
  readonly modalTemplate = viewChild.required<TemplateRef<unknown>>('recoveryModal');

  private readonly ngbModal = inject(NgbModal);
  private readonly recoveryService = inject(DataRecoveryService);
  private readonly analyseScenarioService = inject(AnalyseScenarioService);
  private readonly dataManagementSchedule = inject(DataManagementScheduleService);
  private readonly absenceLookup = inject(AbsenceLookupService);
  private readonly toastShowService = inject(ToastShowService);
  private readonly translateService = inject(TranslateService);
  private readonly launcher = inject(RecoveryDialogLauncherService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authorizationService = inject(AuthorizationService);

  private modalRef: NgbModalRef | null = null;

  /** Absence type of the previous run, so a planner reporting several sick calls picks it only once. */
  private lastAbsenceId = '';

  protected readonly clients = signal<IClientWork[]>([]);
  protected readonly absences = signal<IAbsence[]>([]);
  protected readonly isSubmitting = signal(false);

  /** Result of the last run; while it is set the dialog shows the review step instead of the form. */
  protected readonly result = signal<ICoverAbsenceOutcome | null>(null);

  /** Only a supervisor may override a blocking rule (ISupervisorOverrideAuthorizer), so others never see the box. */
  protected readonly canOverride = computed(() =>
    this.authorizationService.hasAnyPermission(ROLE_ADMIN, ROLE_AUTHORISED),
  );
  protected readonly localError = signal<string | null>(null);

  protected readonly alternativesStatus = RecoveryAlternativesStatus;
  protected readonly displayTime = formatTime;
  protected readonly slotOutcomes = signal<Record<string, ReplacementRequestOutcome>>({});
  protected readonly alternatives = signal<Record<string, IRecoveryAlternativesState>>({});
  protected readonly alternativeOutcomes = signal<Record<string, ReplacementRequestOutcome>>({});
  protected readonly storedRequests = signal<Record<string, IReplacementRequest>>({});
  private storedRequestsToken: string | null = null;
  private readonly savingKeys = signal<ReadonlySet<string>>(new Set());
  private readonly expandedSlots = signal<ReadonlySet<string>>(new Set());
  private submission: IRecoverySubmission | null = null;

  private readonly formModel = signal<IRecoveryFormModel>(this.emptyModel());
  protected readonly recoveryForm = form(this.formModel);

  constructor() {
    this.launcher.requests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((preset) => void this.open(preset));
  }

  async open(preset: IRecoveryDialogPreset = {}): Promise<void> {
    this.clients.set(this.dataManagementSchedule.clients);
    await this.absenceLookup.loadIfNeeded();
    this.absences.set(this.absenceLookup.absences());

    this.result.set(null);
    this.resetReviewState();
    this.localError.set(null);
    this.formModel.set({
      ...this.emptyModel(),
      selectedClientId: preset.clientId ?? '',
      selectedAbsenceId: this.rememberedAbsenceId(),
      selectedDate: preset.date ? formatDateOnly(preset.date) : this.defaultDate(),
      selectedUntilDate: preset.untilDate ? formatDateOnly(preset.untilDate) : '',
    });

    // Re-opening while a previous instance is still up (two quick right-clicks) must not stack modals.
    this.modalRef?.close();
    this.modalRef = this.ngbModal.open(this.modalTemplate(), { centered: true, size: 'md' });
  }

  protected readonly selectedClientLabel = computed(() => {
    const selectedClientId = this.formModel().selectedClientId;
    const client = this.clients().find((candidate) => candidate.id === selectedClientId);
    return client ? this.clientLabel(client) : '';
  });

  protected clientLabel(client: IClientWork): string {
    return [client.firstName, client.name].filter(Boolean).join(' ') || client.id;
  }

  protected absenceLabel(absence: IAbsence): string {
    return getLocalizedValue(absence.name, this.translateService.currentLang) || (absence.id ?? '');
  }

  protected canSubmit(): boolean {
    const { selectedClientId, selectedAbsenceId, selectedDate, selectedUntilDate } = this.formModel();
    if (!selectedClientId || !selectedAbsenceId || !selectedDate || this.isSubmitting()) {
      return false;
    }

    // An empty end means a single day; a filled one must not lie before the start.
    return !selectedUntilDate || selectedUntilDate >= selectedDate;
  }

  /** Translation key for the reason a slot stayed open, so the review shows prose, not an engine token. */
  protected uncoveredReasonKey(reason: string): string {
    switch (reason) {
      case 'locked':
        return 'recovery.dialog.reason.locked';
      case 'blocked':
        return 'recovery.dialog.reason.blocked';
      case 'non-critical':
        return 'recovery.dialog.reason.nonCritical';
      default:
        return 'recovery.dialog.reason.noCandidate';
    }
  }

  /** Translation key for how far the engine had to search to fill a slot. */
  protected tierKey(tier: number): string {
    return `recovery.dialog.tier.${tier}`;
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    const groupId = this.dataManagementSchedule.workFilter.selectedGroup;
    if (!groupId) {
      this.toastShowService.showError(this.translateService.instant('recovery.dialog.noGroup'));
      return;
    }

    const {
      selectedClientId,
      selectedAbsenceId,
      selectedDate,
      selectedUntilDate,
      overrideBlock,
      notifyEscalationRoster,
    } = this.formModel();
    this.isSubmitting.set(true);
    this.localError.set(null);
    try {
      const outcome = await firstValueFrom(
        this.recoveryService.coverAbsence({
          clientId: selectedClientId,
          date: selectedDate,
          groupId,
          absenceId: selectedAbsenceId,
          untilDate: selectedUntilDate || undefined,
          overrideBlock: overrideBlock || undefined,
          notifyEscalationRoster,
          language: this.translateService.currentLang || undefined,
        }),
      );
      this.lastAbsenceId = selectedAbsenceId;

      const newScenario: IAnalyseScenario = {
        id: outcome.scenarioId,
        name: outcome.scenarioName,
        token: outcome.token,
        fromDate: '',
        untilDate: '',
        createdByUser: RECOVERY_CREATOR,
        status: AnalyseScenarioStatus.Active,
      };

      this.analyseScenarioService.scenarios.update((list) =>
        list.some((s) => s.id === newScenario.id) ? list : [...list, newScenario],
      );
      this.analyseScenarioService.selectScenario(newScenario);
      this.dataManagementSchedule.readDatas();

      // Stay open and show what was proposed. Closing on a toast with two numbers left the dispatcher
      // to hunt through the schedule for what actually changed and what is still uncovered.
      this.resetReviewState();
      this.submission = {
        absentClientId: selectedClientId,
        absenceId: selectedAbsenceId,
        groupId,
        overrideBlock,
      };
      this.result.set(outcome);
    } catch (err: unknown) {
      this.localError.set(this.errorMessage(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onClose(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  /** Back to the form to try another day or another absence without reopening the dialog. */
  protected onBackToForm(): void {
    this.result.set(null);
    this.resetReviewState();
    this.localError.set(null);
  }

  protected slotKey(slot: ICoveredSlot): string {
    return [slot.shiftId, slot.date, slot.startTime ?? ''].join(KEY_SEPARATOR);
  }

  protected alternativeKey(slot: ICoveredSlot, candidate: IReplacementCandidate): string {
    return this.candidateKey(slot, candidate.clientId);
  }

  private candidateKey(slot: ICoveredSlot, clientId: string): string {
    return [this.slotKey(slot), clientId].join(KEY_SEPARATOR);
  }

  protected hasSlotTimes(slot: ICoveredSlot): boolean {
    return !!slot.startTime && !!slot.endTime;
  }

  protected phoneHref(phone: string): string {
    return TEL_SCHEME + phone.replace(PHONE_WHITESPACE, '');
  }

  protected outcomeStateKey(outcome: ReplacementRequestOutcome | null | undefined): string {
    return OUTCOME_STATE_KEY_PREFIX + (outcome ?? ReplacementRequestOutcome.Proposed);
  }

  /** The saved response of the proposed stand-in; the server value until the planner records a new one. */
  protected slotOutcome(slot: ICoveredSlot): ReplacementRequestOutcome | null {
    const saved = slot.requestId ? this.slotOutcomes()[slot.requestId] : undefined;
    return saved ?? this.storedSlotRequest(slot)?.outcome ?? slot.outcome ?? null;
  }

  /** Without a stored request row there is nothing to save the response on; an applied row is read-only. */
  protected isSlotOutcomeDisabled(slot: ICoveredSlot): boolean {
    return (
      !slot.requestId ||
      this.savingKeys().has(this.slotKey(slot)) ||
      isReplacementRequestApplied(this.storedSlotRequest(slot))
    );
  }

  protected alternativeOutcome(slot: ICoveredSlot, candidate: IReplacementCandidate): ReplacementRequestOutcome | null {
    const key = this.alternativeKey(slot, candidate);
    return this.alternativeOutcomes()[key] ?? this.storedRequests()[key]?.outcome ?? null;
  }

  protected isAlternativeOutcomeDisabled(slot: ICoveredSlot, candidate: IReplacementCandidate): boolean {
    const key = this.alternativeKey(slot, candidate);
    return (
      !this.hasSlotTimes(slot) ||
      this.savingKeys().has(key) ||
      isReplacementRequestApplied(this.storedRequests()[key])
    );
  }

  protected isExpanded(slot: ICoveredSlot): boolean {
    return this.expandedSlots().has(this.slotKey(slot));
  }

  protected alternativesOf(slot: ICoveredSlot): IRecoveryAlternativesState {
    return this.alternatives()[this.slotKey(slot)] ?? ALTERNATIVES_LOADING;
  }

  async onSlotOutcome(slot: ICoveredSlot, outcome: ReplacementRequestOutcome): Promise<void> {
    const requestId = slot.requestId;
    const key = this.slotKey(slot);
    if (!requestId || this.savingKeys().has(key)) {
      return;
    }

    const reviewed = this.result();
    this.setSaving(key, true);
    try {
      const saved = await firstValueFrom(this.recoveryService.updateRequestOutcome(requestId, outcome));
      if (this.result() === reviewed) {
        this.slotOutcomes.update((map) => ({ ...map, [requestId]: saved.outcome }));
      }
    } catch {
      this.showOutcomeSaveError();
    } finally {
      this.setSaving(key, false);
    }
  }

  async onToggleAlternatives(slot: ICoveredSlot): Promise<void> {
    const key = this.slotKey(slot);
    const expanded = new Set(this.expandedSlots());
    if (expanded.has(key)) {
      expanded.delete(key);
      this.expandedSlots.set(expanded);
      return;
    }

    expanded.add(key);
    this.expandedSlots.set(expanded);
    const current = this.alternatives()[key];
    if (current && current.status !== RecoveryAlternativesStatus.Failed) {
      return;
    }

    await this.loadAlternatives(slot, key);
  }

  /** Records a contact attempt on an alternative; the proposal in the scenario is not swapped. */
  async onAlternativeOutcome(
    slot: ICoveredSlot,
    candidate: IReplacementCandidate,
    outcome: ReplacementRequestOutcome,
  ): Promise<void> {
    const reviewed = this.result();
    const submission = this.submission;
    const key = this.alternativeKey(slot, candidate);
    if (!reviewed || !submission || !slot.startTime || !slot.endTime || this.savingKeys().has(key)) {
      return;
    }

    this.setSaving(key, true);
    try {
      const saved = await firstValueFrom(
        this.recoveryService.recordRequest({
          absentClientId: submission.absentClientId,
          candidateClientId: candidate.clientId,
          shiftId: slot.shiftId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          groupId: submission.groupId,
          absenceId: submission.absenceId,
          analyseToken: reviewed.token,
          outcome,
        }),
      );
      if (this.result() === reviewed) {
        this.alternativeOutcomes.update((map) => ({ ...map, [key]: saved.outcome }));
      }
    } catch {
      this.showOutcomeSaveError();
    } finally {
      this.setSaving(key, false);
    }
  }

  private async loadAlternatives(slot: ICoveredSlot, key: string): Promise<void> {
    const reviewed = this.result();
    const submission = this.submission;
    if (!reviewed || !submission) {
      return;
    }

    this.setAlternatives(key, ALTERNATIVES_LOADING);
    void this.loadStoredRequests(reviewed, submission);
    try {
      const response = await firstValueFrom(
        this.recoveryService.getCandidates({
          shiftId: slot.shiftId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          groupId: submission.groupId,
          analyseToken: reviewed.token,
          overrideBlock: submission.overrideBlock || undefined,
        }),
      );
      if (this.result() !== reviewed) {
        return;
      }

      const candidates = (response.eligible ?? []).filter(
        (candidate) => candidate.clientId !== slot.replacementClientId,
      );
      this.setAlternatives(key, { status: RecoveryAlternativesStatus.Loaded, candidates });
    } catch {
      if (this.result() === reviewed) {
        this.setAlternatives(key, { status: RecoveryAlternativesStatus.Failed, candidates: [] });
      }
    }
  }

  /** Loads the rows stored for the reviewed scenario once per result; a failure only leaves them unfilled. */
  private async loadStoredRequests(reviewed: ICoverAbsenceOutcome, submission: IRecoverySubmission): Promise<void> {
    if (this.storedRequestsToken === reviewed.token) {
      return;
    }

    this.storedRequestsToken = reviewed.token;
    try {
      const rows = await firstValueFrom(
        this.recoveryService.getRequests({
          analyseToken: reviewed.token,
          absentClientId: submission.absentClientId,
        }),
      );
      if (this.result() === reviewed) {
        this.storedRequests.set(this.indexStoredRequests(reviewed.covered, rows ?? []));
      }
    } catch {
      if (this.result() === reviewed) {
        this.storedRequestsToken = null;
      }
    }
  }

  private indexStoredRequests(
    covered: ICoveredSlot[],
    rows: IReplacementRequest[],
  ): Record<string, IReplacementRequest> {
    const index: Record<string, IReplacementRequest> = {};
    for (const slot of covered) {
      for (const row of rows) {
        if (row.shiftId !== slot.shiftId || !isSameCalendarDate(row.date, slot.date)) {
          continue;
        }

        const key = this.candidateKey(slot, row.candidateClientId);
        const current = index[key];
        if (!current || this.isNewerRequest(row, current, slot)) {
          index[key] = row;
        }
      }
    }
    return index;
  }

  /** The proposal's own row wins for the stand-in; otherwise the most recent response is shown. */
  private isNewerRequest(row: IReplacementRequest, current: IReplacementRequest, slot: ICoveredSlot): boolean {
    if (slot.requestId && current.id === slot.requestId) {
      return false;
    }
    if (slot.requestId && row.id === slot.requestId) {
      return true;
    }
    return this.requestTimestamp(row) > this.requestTimestamp(current);
  }

  private requestTimestamp(row: IReplacementRequest): string {
    return row.outcomeAtUtc ?? row.reportedAtUtc;
  }

  private storedSlotRequest(slot: ICoveredSlot): IReplacementRequest | undefined {
    return this.storedRequests()[this.candidateKey(slot, slot.replacementClientId)];
  }

  private setAlternatives(key: string, state: IRecoveryAlternativesState): void {
    this.alternatives.update((map) => ({ ...map, [key]: state }));
  }

  private setSaving(key: string, saving: boolean): void {
    const next = new Set(this.savingKeys());
    if (saving) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.savingKeys.set(next);
  }

  private showOutcomeSaveError(): void {
    this.toastShowService.showError(this.translateService.instant('recovery.dialog.outcomeSaveFailed'));
  }

  private resetReviewState(): void {
    this.submission = null;
    this.slotOutcomes.set({});
    this.alternatives.set({});
    this.alternativeOutcomes.set({});
    this.storedRequests.set({});
    this.storedRequestsToken = null;
    this.savingKeys.set(new Set());
    this.expandedSlots.set(new Set());
  }

  /**
   * The controller answers with ProblemDetails, so the reason is in `detail`. Showing it beats a generic
   * message: a refused range or a blocking rule is something the dispatcher can act on.
   */
  private errorMessage(err: unknown): string {
    const body = (err as { error?: { detail?: unknown; message?: unknown } } | null)?.error;
    if (typeof body?.detail === 'string' && body.detail.length > 0) {
      return body.detail;
    }

    if (typeof body?.message === 'string' && body.message.length > 0) {
      return body.message;
    }

    return this.translateService.instant('recovery.dialog.failed');
  }

  /** Today when it lies inside the visible period (the usual sick call), otherwise the period start. */
  private defaultDate(): string {
    const start = this.dataManagementSchedule.periodStartDate;
    const end = this.dataManagementSchedule.periodEndDate;
    const today = companyToday();
    if (start && end && today >= start && today <= end) {
      return formatDateOnly(today);
    }
    return start ? formatDateOnly(start) : '';
  }

  /** The previously used absence type, as long as it is still in the catalog. */
  private rememberedAbsenceId(): string {
    return this.absences().some((absence) => absence.id === this.lastAbsenceId) ? this.lastAbsenceId : '';
  }

  private emptyModel(): IRecoveryFormModel {
    return {
      selectedClientId: '',
      selectedAbsenceId: '',
      selectedDate: '',
      selectedUntilDate: '',
      overrideBlock: false,
      notifyEscalationRoster: false,
    };
  }
}
