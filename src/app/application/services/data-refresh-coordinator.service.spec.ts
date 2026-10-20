// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { DataRefreshCoordinator } from './data-refresh-coordinator.service';
import { DataRefreshRegistry } from './data-refresh-registry.service';
import { WorkplaceStateService } from './workplace-state.service';
import { AssistantSignalRService } from 'src/app/infrastructure/signalr/assistant-signalr.service';
import { INTERACTIVE_REPLY_NOTIFIER } from 'src/app/domain/interfaces/interactive-reply-notifier.interface';
import { IEntityChanged } from 'src/app/domain/interfaces/entity-changed.interface';
import { ISuggestedRepliesConfig } from 'src/app/domain/models/assistant/suggested-reply.interface';

const BUFFER_FLUSH_MS = 400;
const ENTITY_TYPE = 'shift';

interface RefreshTargetStub {
  refreshableEntities: string[];
  reload: ReturnType<typeof vi.fn>;
  areObjectsDirty: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
}

describe('DataRefreshCoordinator', () => {
  let entityChanged$: Subject<IEntityChanged>;
  let notifier: { showInteractiveReply: ReturnType<typeof vi.fn> };
  let target: RefreshTargetStub;

  const createTarget = (dirty: boolean): RefreshTargetStub => ({
    refreshableEntities: [ENTITY_TYPE],
    reload: vi.fn(),
    areObjectsDirty: vi.fn(() => dirty),
    save: vi.fn(),
  });

  const pushChange = (): void => {
    entityChanged$.next({ entityTypes: [ENTITY_TYPE], operation: 'update', skillName: 'test', timestamp: '' });
    vi.advanceTimersByTime(BUFFER_FLUSH_MS);
  };

  const startWith = (activeTarget: RefreshTargetStub): void => {
    target = activeTarget;
    TestBed.configureTestingModule({
      providers: [
        { provide: AssistantSignalRService, useValue: { entityChanged$ } },
        { provide: WorkplaceStateService, useValue: { activeManager: signal(activeTarget) } },
        { provide: DataRefreshRegistry, useValue: { matching: () => [] } },
        { provide: INTERACTIVE_REPLY_NOTIFIER, useValue: notifier },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });
    TestBed.inject(DataRefreshCoordinator).start();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    entityChanged$ = new Subject<IEntityChanged>();
    notifier = { showInteractiveReply: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should reload a clean active page right away without asking', () => {
    // Arrange
    startWith(createTarget(false));

    // Act
    pushChange();

    // Assert
    expect(target.reload).toHaveBeenCalledTimes(1);
    expect(notifier.showInteractiveReply).not.toHaveBeenCalled();
  });

  it('should ask through the reply notifier instead of overwriting a dirty page', () => {
    // Arrange
    startWith(createTarget(true));

    // Act
    pushChange();

    // Assert
    expect(target.reload).not.toHaveBeenCalled();
    expect(notifier.showInteractiveReply).toHaveBeenCalledTimes(1);
  });

  it('should reload the dirty page once the user picks the reload option', () => {
    // Arrange
    startWith(createTarget(true));
    pushChange();
    const [config, onSelected] = notifier.showInteractiveReply.mock.calls[0] as [
      ISuggestedRepliesConfig,
      (values: string[]) => void,
    ];

    // Act
    onSelected([config.options[0].value]);

    // Assert
    expect(target.reload).toHaveBeenCalledTimes(1);
  });
});
