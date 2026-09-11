// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { AppReloadCoordinator } from './app-reload-coordinator.service';
import { PageReloaderService } from './page-reloader.service';
import { APP_RELOAD_TOAST } from './app-reload-toast.constants';
import { AppReloadRequestService } from 'src/app/application/services/app-reload-request.service';
import { AppVersionWatchService } from 'src/app/application/services/app-version-watch.service';
import { ChunkLoadRecoveryService } from 'src/app/application/services/chunk-load-recovery.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { IAppReloadRequest } from 'src/app/domain/interfaces/app-reload-request.interface';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../toast/toast.service';
import { IToast } from '../toast/toast.interface';

const KEYS = APP_RELOAD_TOAST.KEYS;
const TARGET_URL = '/workplace/schedule';
const VERSION_REQUEST: IAppReloadRequest = { reason: AppReloadReason.Version, autoReloadAllowed: true };
const OUTAGE_REQUEST: IAppReloadRequest = { reason: AppReloadReason.Outage, autoReloadAllowed: true };
const CHUNK_REQUEST: IAppReloadRequest = {
  reason: AppReloadReason.Chunk,
  targetUrl: TARGET_URL,
  autoReloadAllowed: true,
};
const COUNTDOWN_SECONDS = 10;
const ONE_SECOND_MS = 1000;
const COUNTDOWN_MS = COUNTDOWN_SECONDS * ONE_SECOND_MS;
const SNOOZE_MS = 15 * 60 * 1000;
const WAIT_RECHECK_INTERVAL_MS = 5000;
const FOCUS_IDLE_MS = 60_000;
const TYPED_KEY = 'a';
const CHECKBOX_TYPE = 'checkbox';

describe('AppReloadCoordinator', () => {
  let reloadRequests: AppReloadRequestService;
  let toastService: ToastService;
  let pageReloader: { reload: ReturnType<typeof vi.fn>; navigateTo: ReturnType<typeof vi.fn> };
  let chunkLoadRecovery: { recordReload: ReturnType<typeof vi.fn> };
  let versionWatch: { recordReload: ReturnType<typeof vi.fn> };
  let workplaceState: { isDirty: boolean; activeManager: () => unknown };
  let activeManager: unknown;
  let authenticated: boolean;
  let modalOpen: boolean;
  let activeModals: Subject<unknown[]>;
  let translateInstant: (key: string, params?: Record<string, unknown>) => string;

  const countdownText = (key: string, seconds: number): string => `${key}|${seconds}`;
  const reloadToast = (): IToast | undefined =>
    toastService.toasts().find((toast) => toast.name === APP_RELOAD_TOAST.NAME);
  const chooseAction = (labelKey: string): void => {
    const action = reloadToast()?.actions?.find((candidate) => candidate.label === labelKey);
    if (!action) {
      throw new Error(`No toast action ${labelKey}`);
    }
    action.onClick();
  };
  const focusNewElement = (tagName: string, type?: string): HTMLElement => {
    const element = document.createElement(tagName);
    if (type) {
      element.setAttribute('type', type);
    }
    document.body.appendChild(element);
    element.focus();
    return element;
  };
  const typeInto = (element: HTMLElement): void => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key: TYPED_KEY, bubbles: true }));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    activeManager = null;
    authenticated = true;
    modalOpen = false;
    activeModals = new Subject<unknown[]>();
    translateInstant = (key, params) =>
      params ? countdownText(key, Number(params[APP_RELOAD_TOAST.SECONDS_PARAM])) : key;
    pageReloader = { reload: vi.fn(), navigateTo: vi.fn() };
    chunkLoadRecovery = { recordReload: vi.fn() };
    versionWatch = { recordReload: vi.fn() };
    workplaceState = { isDirty: false, activeManager: () => activeManager };

    TestBed.configureTestingModule({
      providers: [
        { provide: WorkplaceStateService, useValue: workplaceState },
        { provide: PageReloaderService, useValue: pageReloader },
        { provide: ChunkLoadRecoveryService, useValue: chunkLoadRecovery },
        { provide: AppVersionWatchService, useValue: versionWatch },
        { provide: AuthService, useValue: { authenticated: () => authenticated } },
        { provide: NgbModal, useValue: { hasOpenModals: () => modalOpen, activeInstances: activeModals } },
        {
          provide: TranslateService,
          useValue: { instant: (key: string, params?: Record<string, unknown>) => translateInstant(key, params) },
        },
      ],
    });
    reloadRequests = TestBed.inject(AppReloadRequestService);
    toastService = TestBed.inject(ToastService);
    TestBed.inject(AppReloadCoordinator).start();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('stops the countdown when the coordinator is destroyed', async () => {
    reloadRequests.requestReload(VERSION_REQUEST);
    TestBed.resetTestingModule();

    await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

    expect(pageReloader.reload).not.toHaveBeenCalled();
  });

  describe('when nothing holds the reload back', () => {
    it('shows a ten-second countdown and reloads the current page when it runs out', async () => {
      // Act
      reloadRequests.requestReload(VERSION_REQUEST);

      // Assert
      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS - ONE_SECOND_MS);
      expect(pageReloader.reload).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(ONE_SECOND_MS);
      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
      expect(reloadToast()).toBeUndefined();
    });

    it('counts the remaining seconds down in the toast text', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);

      await vi.advanceTimersByTimeAsync(ONE_SECOND_MS);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS - 1));
    });

    it('offers "now" and "later" and reloads at once on "now"', () => {
      reloadRequests.requestReload(VERSION_REQUEST);
      expect(reloadToast()?.actions?.map((action) => action.label)).toEqual([KEYS.NOW, KEYS.LATER]);

      chooseAction(KEYS.NOW);

      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
    });

    it('postpones by fifteen minutes on "later" and then counts down again', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);

      chooseAction(KEYS.LATER);

      expect(reloadToast()).toBeUndefined();
      await vi.advanceTimersByTimeAsync(SNOOZE_MS - ONE_SECOND_MS);
      expect(reloadToast()).toBeUndefined();
      expect(pageReloader.reload).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(ONE_SECOND_MS);
      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('uses the reconnect wording for the end of an outage', () => {
      reloadRequests.requestReload(OUTAGE_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.RECONNECTED_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('switches to the new-version wording when a version request follows an outage request', () => {
      reloadRequests.requestReload(OUTAGE_REQUEST);
      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
      expect(toastService.toasts().length).toBe(1);
    });

    it('does not restart the countdown for a repeated identical request', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);
      await vi.advanceTimersByTimeAsync(3 * ONE_SECOND_MS);

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS - 3));
    });

    it('never reloads without a visible toast', async () => {
      translateInstant = () => '';

      reloadRequests.requestReload(VERSION_REQUEST);
      await vi.advanceTimersByTimeAsync(2 * COUNTDOWN_MS);

      expect(reloadToast()).toBeUndefined();
      expect(pageReloader.reload).not.toHaveBeenCalled();
    });

    it('records the reload for the version loop guard only at the moment the page reloads', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);
      chooseAction(KEYS.LATER);
      expect(versionWatch.recordReload).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(SNOOZE_MS + COUNTDOWN_MS - ONE_SECOND_MS);
      expect(versionWatch.recordReload).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(ONE_SECOND_MS);
      expect(versionWatch.recordReload).toHaveBeenCalledTimes(1);
      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
    });

    it('retries the countdown toast when the toast service could not show it, e.g. a duplicate text', async () => {
      const initialCountdownText = countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS);
      const blocker = toastService.show(initialCountdownText)!;

      reloadRequests.requestReload(VERSION_REQUEST);
      expect(reloadToast()).toBeUndefined();

      toastService.removeById(blocker.id);
      await vi.advanceTimersByTimeAsync(WAIT_RECHECK_INTERVAL_MS);

      expect(reloadToast()?.textOrTpl).toBe(initialCountdownText);
      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('unsaved changes', () => {
    it('shows a standing reload toast instead of a countdown when the workplace is dirty', async () => {
      workplaceState.isDirty = true;

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(KEYS.UPDATE_AVAILABLE);
      expect(reloadToast()?.actions?.map((action) => action.label)).toEqual([KEYS.RELOAD]);
      await vi.advanceTimersByTimeAsync(SNOOZE_MS);
      expect(pageReloader.reload).not.toHaveBeenCalled();
      expect(reloadToast()).toBeDefined();
    });

    it('treats a dirty active manager as unsaved changes', () => {
      activeManager = { areObjectsDirty: () => true, save: () => undefined };

      reloadRequests.requestReload(OUTAGE_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(KEYS.RECONNECTED_AVAILABLE);
    });

    it('reloads when the user chooses "reload" on the standing toast', () => {
      workplaceState.isDirty = true;
      reloadRequests.requestReload(VERSION_REQUEST);

      chooseAction(KEYS.RELOAD);

      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
      expect(versionWatch.recordReload).toHaveBeenCalledTimes(1);
    });

    it('turns a running countdown into the standing toast when changes become unsaved', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);
      workplaceState.isDirty = true;

      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

      expect(pageReloader.reload).not.toHaveBeenCalled();
      expect(reloadToast()?.textOrTpl).toBe(KEYS.UPDATE_AVAILABLE);
    });

    it('shows the standing toast for a request that forbids the automatic reload', () => {
      reloadRequests.requestReload({ ...VERSION_REQUEST, autoReloadAllowed: false });

      expect(reloadToast()?.textOrTpl).toBe(KEYS.UPDATE_AVAILABLE);
    });

    it('retries the standing toast when the toast service could not show it, e.g. a duplicate text', async () => {
      const blocker = toastService.show(KEYS.UPDATE_AVAILABLE)!;
      workplaceState.isDirty = true;

      reloadRequests.requestReload(VERSION_REQUEST);
      expect(reloadToast()).toBeUndefined();

      toastService.removeById(blocker.id);
      await vi.advanceTimersByTimeAsync(WAIT_RECHECK_INTERVAL_MS);

      expect(reloadToast()?.textOrTpl).toBe(KEYS.UPDATE_AVAILABLE);
    });
  });

  describe('dialog open or user typing', () => {
    it('waits while a dialog is open and counts down once it closes', async () => {
      modalOpen = true;
      reloadRequests.requestReload(VERSION_REQUEST);
      expect(reloadToast()).toBeUndefined();

      modalOpen = false;
      activeModals.next([]);
      await vi.advanceTimersByTimeAsync(0);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('stops a running countdown and waits when a dialog opens', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);
      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));

      modalOpen = true;
      await vi.advanceTimersByTimeAsync(ONE_SECOND_MS);

      expect(reloadToast()).toBeUndefined();
      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
      expect(pageReloader.reload).not.toHaveBeenCalled();
      expect(reloadToast()).toBeUndefined();
    });

    it('waits while the user types in a text field and counts down after focus leaves it', async () => {
      const input = focusNewElement('input');
      typeInto(input);
      reloadRequests.requestReload(VERSION_REQUEST);
      expect(reloadToast()).toBeUndefined();

      input.blur();
      document.dispatchEvent(new FocusEvent('focusout'));
      await vi.advanceTimersByTimeAsync(0);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('keeps waiting as long as the user keeps typing', async () => {
      const input = focusNewElement('input');
      typeInto(input);
      reloadRequests.requestReload(VERSION_REQUEST);

      await vi.advanceTimersByTimeAsync(FOCUS_IDLE_MS - WAIT_RECHECK_INTERVAL_MS);
      typeInto(input);
      await vi.advanceTimersByTimeAsync(FOCUS_IDLE_MS - WAIT_RECHECK_INTERVAL_MS);

      expect(reloadToast()).toBeUndefined();
      expect(pageReloader.reload).not.toHaveBeenCalled();
    });

    it('counts down after sixty seconds without typing although the text field keeps the focus', async () => {
      const input = focusNewElement('input');
      typeInto(input);
      reloadRequests.requestReload(VERSION_REQUEST);

      await vi.advanceTimersByTimeAsync(FOCUS_IDLE_MS - WAIT_RECHECK_INTERVAL_MS);
      expect(reloadToast()).toBeUndefined();

      await vi.advanceTimersByTimeAsync(WAIT_RECHECK_INTERVAL_MS);

      expect(document.activeElement).toBe(input);
      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
      expect(reloadToast()?.actions?.map((action) => action.label)).toEqual([KEYS.NOW, KEYS.LATER]);
    });

    it('counts down at once when a text field has focus but nobody typed', () => {
      focusNewElement('textarea');

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('stops a running countdown when the user starts typing', async () => {
      reloadRequests.requestReload(VERSION_REQUEST);

      typeInto(focusNewElement('textarea'));
      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

      expect(pageReloader.reload).not.toHaveBeenCalled();
      expect(reloadToast()).toBeUndefined();
    });

    it('does not treat a focused checkbox as a text field', () => {
      typeInto(focusNewElement('input', CHECKBOX_TYPE));

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('counts down on the login page although the username field has focus', () => {
      authenticated = false;
      typeInto(focusNewElement('input'));

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('still waits for an open dialog on the login page', () => {
      authenticated = false;
      modalOpen = true;

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()).toBeUndefined();
    });

    it('re-checks periodically while waiting, also without a close or focusout notification', async () => {
      modalOpen = true;
      reloadRequests.requestReload(VERSION_REQUEST);

      modalOpen = false;
      await vi.advanceTimersByTimeAsync(WAIT_RECHECK_INTERVAL_MS);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });
  });

  describe('chunk failures', () => {
    it('loads the URL the user tried to open and records the chunk reload', async () => {
      reloadRequests.requestReload(CHUNK_REQUEST);

      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

      expect(chunkLoadRecovery.recordReload).toHaveBeenCalledTimes(1);
      expect(versionWatch.recordReload).toHaveBeenCalledTimes(1);
      expect(pageReloader.navigateTo).toHaveBeenCalledWith(TARGET_URL);
      expect(pageReloader.reload).not.toHaveBeenCalled();
    });

    it('reloads the current page for a chunk failure without a target URL', async () => {
      reloadRequests.requestReload({ reason: AppReloadReason.Chunk, autoReloadAllowed: true });

      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

      expect(chunkLoadRecovery.recordReload).toHaveBeenCalledTimes(1);
      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
    });

    it('ends a "later" postponement, because the user cannot continue without the chunk', () => {
      reloadRequests.requestReload(VERSION_REQUEST);
      chooseAction(KEYS.LATER);

      reloadRequests.requestReload(CHUNK_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
    });

    it('keeps the target URL when the error handler reports the same failure without it', async () => {
      reloadRequests.requestReload(CHUNK_REQUEST);
      reloadRequests.requestReload({ reason: AppReloadReason.Chunk, autoReloadAllowed: true });

      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);

      expect(pageReloader.navigateTo).toHaveBeenCalledWith(TARGET_URL);
    });
  });

  describe('a newer build after a loop-guard block', () => {
    it('shows the standing toast for a version request blocked by the loop guard', () => {
      reloadRequests.requestReload({ ...VERSION_REQUEST, autoReloadAllowed: false });

      expect(reloadToast()?.textOrTpl).toBe(KEYS.UPDATE_AVAILABLE);
      expect(reloadToast()?.actions?.map((action) => action.label)).toEqual([KEYS.RELOAD]);
    });

    it('switches to a countdown and reloads once a newer version request allows it', async () => {
      reloadRequests.requestReload({ ...VERSION_REQUEST, autoReloadAllowed: false });

      reloadRequests.requestReload(VERSION_REQUEST);

      expect(reloadToast()?.textOrTpl).toBe(countdownText(KEYS.UPDATE_COUNTDOWN, COUNTDOWN_SECONDS));
      await vi.advanceTimersByTimeAsync(COUNTDOWN_MS);
      expect(pageReloader.reload).toHaveBeenCalledTimes(1);
    });
  });
});
