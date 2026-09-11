// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Decides whether and when a requested page reload happens - for a newer deployed version, the end of
 * a backend outage, or a chunk of the running bundle that is gone. Unsaved changes are never reloaded
 * away: the user gets a standing toast with a reload button instead. An open dialog postpones the
 * decision, and so does a signed-in user who is typing: focus in a text field only counts while an
 * input, keydown or compositionstart event reached the document within the last 60 seconds, and never
 * on the login page, where no unsaved changes can exist. The decision is taken again when focus leaves,
 * the dialog closes, the next request arrives or the periodic re-check runs. Otherwise a 10-second
 * countdown toast reloads the page unless the user picks "later", which postpones it by 15 minutes. A
 * chunk failure loads the URL the user tried to open and ends a "later" postponement. Requests arriving
 * while one is pending are merged, and no countdown ever runs without a visible toast: ToastService.show()
 * silently returns null for empty or duplicate text, so if the countdown or standing toast could not be
 * shown, the periodic re-check is armed instead of leaving the request stuck - the next re-check tries
 * again. Only at the moment of the actual reload do the version watch and, for a chunk failure, the
 * chunk recovery record it, so a reload that does not help cannot repeat itself.
 */
import { DestroyRef, Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { AppReloadRequestService } from 'src/app/application/services/app-reload-request.service';
import { AppVersionWatchService } from 'src/app/application/services/app-version-watch.service';
import { ChunkLoadRecoveryService } from 'src/app/application/services/chunk-load-recovery.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { IAppReloadRequest } from 'src/app/domain/interfaces/app-reload-request.interface';
import { isSameReloadRequest, mergeReloadRequests } from 'src/app/domain/helpers/app-reload-request.helper';
import { isSaveable } from 'src/app/domain/helpers/manageable.helper';
import { AuthService } from '../auth/auth.service';
import { ToastShowService } from '../toast/toast-show.service';
import { IToast } from '../toast/toast.interface';
import { IToastAction } from '../toast/toast-action.interface';
import { PageReloaderService } from './page-reloader.service';
import { APP_RELOAD_TOAST } from './app-reload-toast.constants';

const COUNTDOWN_SECONDS = 10;
const COUNTDOWN_TICK_MS = 1000;
const SNOOZE_MS = 15 * 60 * 1000;
const WAIT_RECHECK_INTERVAL_MS = 5000;
const FOCUS_IDLE_MS = 60_000;
const FOCUS_SETTLE_DELAY_MS = 0;
const FOCUS_OUT_EVENT = 'focusout';
const TYPING_EVENTS = ['input', 'keydown', 'compositionstart'] as const;
const CAPTURE_PHASE = true;
const EDITABLE_FOCUS_SELECTOR =
  'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset])' +
  ':not([type=range]):not([type=color]):not([type=file]):not([type=hidden]):not([type=image]), ' +
  'textarea, [contenteditable]:not([contenteditable="false"])';

@Injectable({
  providedIn: 'root',
})
export class AppReloadCoordinator {
  private readonly reloadRequests = inject(AppReloadRequestService);
  private readonly versionWatch = inject(AppVersionWatchService);
  private readonly chunkLoadRecovery = inject(ChunkLoadRecoveryService);
  private readonly workplaceState = inject(WorkplaceStateService);
  private readonly authService = inject(AuthService);
  private readonly toastShow = inject(ToastShowService);
  private readonly translate = inject(TranslateService);
  private readonly modal = inject(NgbModal);
  private readonly pageReloader = inject(PageReloaderService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  private started = false;
  private pending: IAppReloadRequest | null = null;
  private toast: IToast | null = null;
  private showingStandingToast = false;
  private secondsLeft = 0;
  private lastTypingAt: number | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private waitTimer: ReturnType<typeof setInterval> | null = null;
  private snoozeTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onFocusOut = (): void => {
    if (this.waitTimer !== null) {
      setTimeout(() => this.decide(), FOCUS_SETTLE_DELAY_MS);
    }
  };

  private readonly onTyping = (): void => {
    this.lastTypingAt = Date.now();
  };

  start(): void {
    if (this.started) {
      return;
    }
    this.started = true;

    this.reloadRequests.requests$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request) => this.handleRequest(request));
    this.modal.activeInstances
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((openModals) => {
        if (openModals.length === 0 && this.waitTimer !== null) {
          setTimeout(() => this.decide(), FOCUS_SETTLE_DELAY_MS);
        }
      });
    this.document.addEventListener(FOCUS_OUT_EVENT, this.onFocusOut);
    TYPING_EVENTS.forEach((type) => this.document.addEventListener(type, this.onTyping, CAPTURE_PHASE));
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener(FOCUS_OUT_EVENT, this.onFocusOut);
      TYPING_EVENTS.forEach((type) => this.document.removeEventListener(type, this.onTyping, CAPTURE_PHASE));
      this.stopCountdown();
      this.stopWaiting();
      this.cancelSnooze();
    });
  }

  private handleRequest(request: IAppReloadRequest): void {
    if (request.reason === AppReloadReason.Chunk) {
      this.cancelSnooze();
    }
    const merged = this.pending ? mergeReloadRequests(this.pending, request) : request;
    if (!this.pending || !isSameReloadRequest(this.pending, merged)) {
      this.resetPresentation();
      this.pending = merged;
    }
    this.decide();
  }

  private decide(): void {
    const request = this.pending;
    if (!request || this.snoozeTimer !== null) {
      return;
    }
    if (!request.autoReloadAllowed || this.hasUnsavedChanges()) {
      this.showStandingToast(request);
      return;
    }
    if (this.isUserBusy()) {
      this.waitForUser();
      return;
    }
    if (this.countdownTimer === null) {
      this.startCountdown(request);
    }
  }

  private showStandingToast(request: IAppReloadRequest): void {
    if (this.showingStandingToast) {
      return;
    }
    this.resetPresentation();
    this.toast = this.toastShow.showActions(
      this.translate.instant(this.standingMessageKey(request)),
      APP_RELOAD_TOAST.NAME,
      [this.action(APP_RELOAD_TOAST.KEYS.RELOAD, () => this.performReload(request))],
    );
    this.showingStandingToast = this.toast !== null;
    if (this.toast === null) {
      this.waitForUser();
    }
  }

  private waitForUser(): void {
    if (this.waitTimer !== null) {
      return;
    }
    this.resetPresentation();
    this.waitTimer = setInterval(() => this.decide(), WAIT_RECHECK_INTERVAL_MS);
  }

  private startCountdown(request: IAppReloadRequest): void {
    this.resetPresentation();
    this.secondsLeft = COUNTDOWN_SECONDS;
    this.toast = this.toastShow.showActions(this.countdownText(request), APP_RELOAD_TOAST.NAME, [
      this.action(APP_RELOAD_TOAST.KEYS.NOW, () => this.performReload(request)),
      this.action(APP_RELOAD_TOAST.KEYS.LATER, () => this.snooze()),
    ]);
    if (this.toast === null) {
      this.waitForUser();
      return;
    }
    this.countdownTimer = setInterval(() => this.tick(request), COUNTDOWN_TICK_MS);
  }

  private tick(request: IAppReloadRequest): void {
    this.secondsLeft -= 1;
    if (this.hasUnsavedChanges()) {
      this.showStandingToast(request);
      return;
    }
    if (this.isUserBusy()) {
      this.waitForUser();
      return;
    }
    if (this.secondsLeft <= 0) {
      this.performReload(request);
      return;
    }
    if (this.toast) {
      this.toastShow.updateText(this.toast, this.countdownText(request));
    }
  }

  private snooze(): void {
    this.resetPresentation();
    this.snoozeTimer = setTimeout(() => {
      this.snoozeTimer = null;
      this.decide();
    }, SNOOZE_MS);
  }

  private performReload(request: IAppReloadRequest): void {
    this.resetPresentation();
    this.cancelSnooze();
    this.pending = null;
    this.versionWatch.recordReload();
    if (request.reason !== AppReloadReason.Chunk) {
      this.pageReloader.reload();
      return;
    }
    this.chunkLoadRecovery.recordReload();
    if (request.targetUrl) {
      this.pageReloader.navigateTo(request.targetUrl);
      return;
    }
    this.pageReloader.reload();
  }

  private resetPresentation(): void {
    this.stopCountdown();
    this.stopWaiting();
    this.dismissToast();
  }

  private dismissToast(): void {
    if (this.toast) {
      this.toastShow.dismiss(this.toast);
    }
    this.toast = null;
    this.showingStandingToast = false;
  }

  private stopCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  private stopWaiting(): void {
    if (this.waitTimer !== null) {
      clearInterval(this.waitTimer);
      this.waitTimer = null;
    }
  }

  private cancelSnooze(): void {
    if (this.snoozeTimer !== null) {
      clearTimeout(this.snoozeTimer);
      this.snoozeTimer = null;
    }
  }

  private hasUnsavedChanges(): boolean {
    if (this.workplaceState.isDirty) {
      return true;
    }
    const manager = this.workplaceState.activeManager();
    return isSaveable(manager) && manager.areObjectsDirty();
  }

  private isUserBusy(): boolean {
    return this.modal.hasOpenModals() || this.isTypingInTextField();
  }

  private isTypingInTextField(): boolean {
    if (!this.authService.authenticated() || !this.typedRecently()) {
      return false;
    }
    const focused = this.document.activeElement;
    return focused instanceof Element && focused.matches(EDITABLE_FOCUS_SELECTOR);
  }

  private typedRecently(): boolean {
    return this.lastTypingAt !== null && Date.now() - this.lastTypingAt < FOCUS_IDLE_MS;
  }

  private countdownText(request: IAppReloadRequest): string {
    const key =
      request.reason === AppReloadReason.Outage
        ? APP_RELOAD_TOAST.KEYS.RECONNECTED_COUNTDOWN
        : APP_RELOAD_TOAST.KEYS.UPDATE_COUNTDOWN;
    return this.translate.instant(key, { [APP_RELOAD_TOAST.SECONDS_PARAM]: this.secondsLeft });
  }

  private standingMessageKey(request: IAppReloadRequest): string {
    return request.reason === AppReloadReason.Outage
      ? APP_RELOAD_TOAST.KEYS.RECONNECTED_AVAILABLE
      : APP_RELOAD_TOAST.KEYS.UPDATE_AVAILABLE;
  }

  private action(labelKey: string, onClick: () => void): IToastAction {
    return { label: this.translate.instant(labelKey), onClick };
  }
}
