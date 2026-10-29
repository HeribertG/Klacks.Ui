// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { ContainerTemplateSessionService } from './container-template-session.service';
import { ContainerTemplateEditorStateService } from './container-template-editor-state.service';
import { ContainerTemplateLifecycleService } from './container-template-lifecycle.service';
import { ContainerTemplateRouteService } from './container-template-route.service';
import { ContainerTemplateTimeWindowService } from './container-template-time-window.service';
import { ContainerTemplateViewRefreshService } from './container-template-view-refresh.service';
import { DataManagementContainerService } from 'src/app/domain/services/container/data-management.container.service';
import { ContainerLockService } from 'src/app/domain/services/container/container-lock.service';
import { ContainerTemplateShiftService } from 'src/app/domain/services/container/container-template-shift.service';
import { TableSortingService } from 'src/app/presentation/services/table-sorting.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { DataRefreshRegistry } from 'src/app/application/services/data-refresh-registry.service';
import { DataRefreshCoordinator } from 'src/app/application/services/data-refresh-coordinator.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { INTERACTIVE_REPLY_NOTIFIER } from 'src/app/domain/interfaces/interactive-reply-notifier.interface';
import { IEntityChanged } from 'src/app/domain/interfaces/entity-changed.interface';
import { IShift } from 'src/app/domain/models/shift/shift.interface';
import { IContainerLock } from 'src/app/domain/models/container/container-lock';
import { RefreshEntityTokens } from 'src/app/domain/constants/refresh-entity-tokens.constants';

const SHIFT_ID = 'container-1';
const TUESDAY = 2;
const BUFFER_FLUSH_MS = 400;
const CONTAINER_TOKEN = RefreshEntityTokens.CONTAINER_TEMPLATE[0];

interface StateStub {
  containerShift: IShift | null;
  selectedWeekday: string;
  isHoliday: boolean;
  isLoading: boolean;
  isReadOnly: boolean;
  selectedWeekdayNumber: () => number;
  applyActiveWeekdays: ReturnType<typeof vi.fn>;
  markReadOnly: ReturnType<typeof vi.fn>;
}

describe('ContainerTemplateSessionService', () => {
  let session: ContainerTemplateSessionService;
  let registry: DataRefreshRegistry;
  let state: StateStub;
  let tasks: object;
  let containerDirty: boolean;
  let currentLock: IContainerLock | null;
  let acquireResult: IContainerLock;
  let containerService: Record<string, ReturnType<typeof vi.fn>>;
  let lockService: Record<string, ReturnType<typeof vi.fn>>;
  let viewRefresh: Record<string, ReturnType<typeof vi.fn>>;
  let toastService: { showInfo: ReturnType<typeof vi.fn> };
  let notifier: { showInteractiveReply: ReturnType<typeof vi.fn> };
  let entityChanged$: Subject<IEntityChanged>;

  const lock = (acquired: boolean): IContainerLock =>
    ({ id: 'lock-1', acquired, isSelfConflict: false, userName: 'Other' }) as IContainerLock;

  const pushContainerChange = (): void => {
    entityChanged$.next({
      entityTypes: [CONTAINER_TOKEN, 'shift'],
      operation: 'update',
      skillName: 'optimize_container_route',
      timestamp: '',
    });
    vi.advanceTimersByTime(BUFFER_FLUSH_MS);
  };

  const loadCount = (): number => containerService['loadTemplates'].mock.calls.length;

  beforeEach(() => {
    vi.useFakeTimers();
    tasks = { tuesday: [] };
    containerDirty = false;
    currentLock = lock(true);
    acquireResult = lock(true);
    entityChanged$ = new Subject<IEntityChanged>();
    notifier = { showInteractiveReply: vi.fn() };
    toastService = { showInfo: vi.fn() };
    state = {
      containerShift: null,
      selectedWeekday: 'tuesday',
      isHoliday: false,
      isLoading: false,
      isReadOnly: false,
      selectedWeekdayNumber: () => TUESDAY,
      applyActiveWeekdays: vi.fn(),
      markReadOnly: vi.fn(() => {
        state.isReadOnly = true;
      }),
    };
    containerService = {
      initializeTemplateGrid: vi.fn(() => of(undefined)),
      loadTasksForWeekday: vi.fn(() => of(undefined)),
      loadTemplates: vi.fn(() => of(undefined)),
      areObjectsDirty: vi.fn(() => containerDirty),
      save: vi.fn(),
      destroy: vi.fn(),
    };
    lockService = {
      acquire: vi.fn(() => of(acquireResult)),
      release: vi.fn(),
      currentLock: vi.fn(() => currentLock),
    };
    viewRefresh = {
      updateAvailableTasks: vi.fn(),
      refreshSelection: vi.fn(),
      markForCheck: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ContainerTemplateSessionService,
        { provide: ContainerTemplateEditorStateService, useValue: state },
        {
          provide: ContainerTemplateLifecycleService,
          useValue: {
            initialize: vi.fn(),
            registerSaveCompletedCallback: vi.fn(),
            clearSaveCompletedCallback: vi.fn(),
            observeRouteParams: vi.fn(() => of(SHIFT_ID)),
            loadShift: vi.fn(() => of({ id: SHIFT_ID } as IShift)),
          },
        },
        { provide: ContainerTemplateRouteService, useValue: { loadStartEndBaseForCurrentTemplate: vi.fn() } },
        {
          provide: ContainerTemplateTimeWindowService,
          useValue: { recalculateDuration: vi.fn(), connect: vi.fn(), applyShiftTimes: vi.fn() },
        },
        { provide: ContainerTemplateViewRefreshService, useValue: viewRefresh },
        { provide: DataManagementContainerService, useValue: containerService },
        { provide: ContainerLockService, useValue: lockService },
        { provide: ContainerTemplateShiftService, useValue: { getAllWeekdayTasks: () => tasks } },
        { provide: TableSortingService, useValue: { initialize: vi.fn() } },
        { provide: ToastShowService, useValue: toastService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
        { provide: AssistantSignalRService, useValue: { entityChanged$ } },
        { provide: WorkplaceStateService, useValue: { activeManager: signal(null) } },
        { provide: INTERACTIVE_REPLY_NOTIFIER, useValue: notifier },
      ],
    });

    session = TestBed.inject(ContainerTemplateSessionService);
    registry = TestBed.inject(DataRefreshRegistry);
    TestBed.inject(DataRefreshCoordinator).start();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('refresh registration', () => {
    it('registers a container template refresh target on start', () => {
      // Act
      session.start();

      // Assert
      expect(registry.matching([CONTAINER_TOKEN])).toHaveLength(1);
    });

    it('unregisters on stop and ignores a reload that reaches the target afterwards', () => {
      // Arrange
      session.start();
      const [target] = registry.matching([CONTAINER_TOKEN]);
      const loadsBeforeStop = loadCount();

      // Act
      session.stop();
      target.reload();

      // Assert
      expect(registry.matching([CONTAINER_TOKEN])).toHaveLength(0);
      expect(loadCount()).toBe(loadsBeforeStop);
    });
  });

  describe('reload on a Klacksy container change', () => {
    it('reloads tasks, templates, bases and route info of the edited weekday when nothing is unsaved', () => {
      // Arrange
      session.start();
      const loadsAfterStart = loadCount();

      // Act
      pushContainerChange();

      // Assert
      expect(notifier.showInteractiveReply).not.toHaveBeenCalled();
      expect(loadCount()).toBe(loadsAfterStart + 1);
      expect(containerService['loadTasksForWeekday']).toHaveBeenLastCalledWith(TUESDAY);
      expect(containerService['loadTemplates']).toHaveBeenLastCalledWith(SHIFT_ID);
      expect(viewRefresh['refreshSelection']).toHaveBeenCalledTimes(1);
    });

    it('asks instead of reloading when the user changed items locally', () => {
      // Arrange
      session.start();
      const loadsAfterStart = loadCount();
      tasks = { tuesday: [{ tmpId: 'new' }] };

      // Act
      pushContainerChange();

      // Assert
      expect(notifier.showInteractiveReply).toHaveBeenCalledTimes(1);
      expect(loadCount()).toBe(loadsAfterStart);
    });

    it('asks instead of reloading when the templates hold unsaved changes', () => {
      // Arrange
      session.start();
      const loadsAfterStart = loadCount();
      containerDirty = true;

      // Act
      pushContainerChange();

      // Assert
      expect(notifier.showInteractiveReply).toHaveBeenCalledTimes(1);
      expect(loadCount()).toBe(loadsAfterStart);
    });

    it('is clean again after a reload, so the next change reloads without asking', () => {
      // Arrange
      session.start();
      tasks = { tuesday: [] };
      const [target] = registry.matching([CONTAINER_TOKEN]);
      target.reload();
      const loadsAfterReload = loadCount();

      // Act
      pushContainerChange();

      // Assert
      expect(notifier.showInteractiveReply).not.toHaveBeenCalled();
      expect(loadCount()).toBe(loadsAfterReload + 1);
    });
  });

  describe('lock on reload', () => {
    it('does not acquire again while the page still holds its lock', () => {
      // Arrange
      session.start();
      lockService['acquire'].mockClear();

      // Act
      pushContainerChange();

      // Assert
      expect(lockService['acquire']).not.toHaveBeenCalled();
    });

    it('acquires a lost lock once on reload', () => {
      // Arrange
      session.start();
      lockService['acquire'].mockClear();
      currentLock = null;

      // Act
      pushContainerChange();

      // Assert
      expect(lockService['acquire']).toHaveBeenCalledTimes(1);
      expect(state.markReadOnly).not.toHaveBeenCalled();
    });

    it('switches to read-only with a notice when someone else took the lock, and does not retry afterwards', () => {
      // Arrange
      session.start();
      lockService['acquire'].mockClear();
      currentLock = null;
      acquireResult = lock(false);

      // Act
      pushContainerChange();
      pushContainerChange();

      // Assert
      expect(lockService['acquire']).toHaveBeenCalledTimes(1);
      expect(state.markReadOnly).toHaveBeenCalledTimes(1);
      expect(toastService.showInfo).toHaveBeenCalledTimes(1);
    });
  });
});
