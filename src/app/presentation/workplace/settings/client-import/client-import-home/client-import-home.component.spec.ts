// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';

import { ClientImportHomeComponent } from './client-import-home.component';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { ClientImportStep } from 'src/app/domain/enums/client-import.enums';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/domain-events';
import { ClientImportPageTab } from '../client-import-page-tab.enum';

describe('ClientImportHomeComponent', () => {
  let targetRequests: Subject<KlacksyTargetRequestedEvent>;
  let state: { step: ReturnType<typeof signal<ClientImportStep>>; restart: ReturnType<typeof vi.fn> };
  let component: ClientImportHomeComponent;

  beforeEach(() => {
    targetRequests = new Subject<KlacksyTargetRequestedEvent>();
    state = { step: signal(ClientImportStep.File), restart: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ClientImportHomeComponent],
      providers: [
        { provide: SavebarService, useValue: { setSavebarVisibility: vi.fn() } },
        { provide: LayoutService, useValue: { setContainerToNormalSize: vi.fn() } },
        { provide: SearchService, useValue: { setSearchVisibility: vi.fn() } },
        { provide: WorkplaceStateService, useValue: { setActiveManagerByRoute: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { on: vi.fn(() => targetRequests.asObservable()), emit: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(ClientImportHomeComponent, {
      set: { template: '', imports: [], providers: [{ provide: ClientImportStateService, useValue: state }] },
    });
    component = TestBed.createComponent(ClientImportHomeComponent).componentInstance;
  });

  it('starts over at the file step when Klacksy points at the upload zone after a finished import', () => {
    state.step.set(ClientImportStep.Result);

    targetRequests.next({ target: 'client-import-drop-zone' });

    expect(state.restart).toHaveBeenCalledTimes(1);
  });

  it('keeps an unfinished mapping when Klacksy points at the upload zone', () => {
    state.step.set(ClientImportStep.Mapping);

    targetRequests.next({ target: 'client-import-drop-zone' });

    expect(state.restart).not.toHaveBeenCalled();
  });

  it('ignores targets outside the file step', () => {
    state.step.set(ClientImportStep.Result);

    targetRequests.next({ target: 'client-import-steps' });

    expect(state.restart).not.toHaveBeenCalled();
  });

  it('opens on the import tab', () => {
    expect(component.activeTab()).toBe(ClientImportPageTab.Import);
  });

  it('brings the import tab back when Klacksy points at an import control while the manual is open', () => {
    component.setTab(ClientImportPageTab.Manual);

    targetRequests.next({ target: 'client-import-drop-zone' });

    expect(component.activeTab()).toBe(ClientImportPageTab.Import);
  });

  it('stays on the manual when Klacksy points at the manual tab itself', () => {
    component.setTab(ClientImportPageTab.Manual);

    targetRequests.next({ target: 'client-import-tab-manual' });

    expect(component.activeTab()).toBe(ClientImportPageTab.Manual);
  });
});
