// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { ClientImportCardComponent } from './client-import-card.component';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import { ClientImportStep } from 'src/app/domain/enums/client-import.enums';
import { EVENT_BUS_TOKEN } from 'src/app/domain/interfaces/event-bus.interface';
import { KlacksyTargetRequestedEvent } from 'src/app/domain/events/klacksy-target-requested-event.interface';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { ClientImportPageTab } from '../client-import/client-import-page-tab.enum';
import {
  CLIENT_IMPORT_MANUAL_MODAL_TITLE_ID,
  CLIENT_IMPORT_MODAL_TITLE_ID,
  CLIENT_IMPORT_MODAL_WINDOW_CLASS,
} from './client-import-modal.constants';

interface FakeModalRef {
  close: ReturnType<typeof vi.fn>;
  dismiss: ReturnType<typeof vi.fn>;
  hidden: Subject<void>;
}

function fakeModalRef(): FakeModalRef {
  const hidden = new Subject<void>();
  return { close: vi.fn(() => hidden.next()), dismiss: vi.fn(), hidden };
}

function fileList(file: File): FileList {
  return { item: () => file, length: 1 } as unknown as FileList;
}

describe('ClientImportCardComponent', () => {
  const file = new File(['a;b'], 'staff.csv');
  let targetRequests: Subject<KlacksyTargetRequestedEvent>;
  let state: {
    step: ReturnType<typeof signal<ClientImportStep>>;
    isParsing: ReturnType<typeof signal<boolean>>;
    isCommitting: ReturnType<typeof signal<boolean>>;
    canCommit: ReturnType<typeof signal<boolean>>;
    fileErrorCode: ReturnType<typeof signal<string | null>>;
    initialize: ReturnType<typeof vi.fn>;
    selectFile: ReturnType<typeof vi.fn>;
    restart: ReturnType<typeof vi.fn>;
    commit: ReturnType<typeof vi.fn>;
    commitErrorKey: ReturnType<typeof vi.fn>;
  };
  let modal: { open: ReturnType<typeof vi.fn> };
  let modalRefs: FakeModalRef[];
  let navigation: { navigateToClient: ReturnType<typeof vi.fn> };
  let component: ClientImportCardComponent;

  const lastOptions = (): NgbModalOptions => modal.open.mock.calls.at(-1)?.[1] as NgbModalOptions;

  beforeEach(() => {
    targetRequests = new Subject<KlacksyTargetRequestedEvent>();
    state = {
      step: signal(ClientImportStep.File),
      isParsing: signal(false),
      isCommitting: signal(false),
      canCommit: signal(true),
      fileErrorCode: signal<string | null>(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      selectFile: vi.fn(async () => {
        state.step.set(ClientImportStep.Mapping);
        return true;
      }),
      restart: vi.fn(() => state.step.set(ClientImportStep.File)),
      commit: vi.fn().mockResolvedValue(true),
      commitErrorKey: vi.fn(() => 'clientImport.error.commit'),
    };
    modalRefs = [];
    modal = {
      open: vi.fn(() => {
        const ref = fakeModalRef();
        modalRefs.push(ref);
        return ref;
      }),
    };
    navigation = { navigateToClient: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ClientImportCardComponent, TranslateModule.forRoot()],
      providers: [
        { provide: NgbModal, useValue: modal },
        { provide: NavigationService, useValue: navigation },
        { provide: ToastShowService, useValue: { showError: vi.fn() } },
        { provide: EVENT_BUS_TOKEN, useValue: { on: vi.fn(() => targetRequests.asObservable()), emit: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(ClientImportCardComponent, {
      set: { providers: [{ provide: ClientImportStateService, useValue: state }] },
    });
    const fixture = TestBed.createComponent(ClientImportCardComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;
  });

  it('shows the import tab with the drop zone and no modal on a plain settings visit', () => {
    expect(component.activeTab()).toBe(ClientImportPageTab.Import);
    expect(modal.open).not.toHaveBeenCalled();
    expect(state.initialize).not.toHaveBeenCalled();
  });

  it('opens the wide import modal once a dropped file was read', async () => {
    await component.onFilesDropped(fileList(file));

    expect(state.selectFile).toHaveBeenCalledWith(file);
    expect(modal.open).toHaveBeenCalledTimes(1);
    expect(lastOptions()).toMatchObject({
      centered: true,
      backdrop: 'static',
      keyboard: true,
      windowClass: CLIENT_IMPORT_MODAL_WINDOW_CLASS,
      ariaLabelledBy: CLIENT_IMPORT_MODAL_TITLE_ID,
    });
    expect(lastOptions().size).toBeUndefined();
  });

  it('keeps the modal closed when the file could not be read, so the error stays on the card', async () => {
    state.selectFile.mockResolvedValueOnce(false);

    await component.onFilesDropped(fileList(file));

    expect(modal.open).not.toHaveBeenCalled();
  });

  it('loads contracts, groups and countries only once, on the first file', async () => {
    await component.onFilesDropped(fileList(file));
    component.onOtherFile();
    await component.onFilesDropped(fileList(file));

    expect(state.initialize).toHaveBeenCalledTimes(1);
  });

  it.each([ClientImportStep.Mapping, ClientImportStep.Preview, ClientImportStep.Result])(
    'lets Esc close the modal at once, without a question, in step %s',
    async (step) => {
      await component.onFilesDropped(fileList(file));
      state.step.set(step);

      expect(lastOptions().beforeDismiss?.()).toBe(true);
    },
  );

  it.each([ClientImportStep.Mapping, ClientImportStep.Preview])(
    'closes at once with the close button in step %s and starts over at the card',
    async (step) => {
      await component.onFilesDropped(fileList(file));
      state.step.set(step);

      component.requestClose();

      expect(modalRefs[0].close).toHaveBeenCalledTimes(1);
      expect(modalRefs[0].dismiss).not.toHaveBeenCalled();
      expect(state.restart).toHaveBeenCalledTimes(1);
      expect(state.step()).toBe(ClientImportStep.File);
    },
  );

  it('starts over at the card when Esc dismisses the modal in the preview step', async () => {
    await component.onFilesDropped(fileList(file));
    state.step.set(ClientImportStep.Preview);

    expect(lastOptions().beforeDismiss?.()).toBe(true);
    modalRefs[0].hidden.next();

    expect(state.restart).toHaveBeenCalledTimes(1);
  });

  it('keeps the backdrop static so a click outside does nothing', async () => {
    await component.onFilesDropped(fileList(file));

    expect(lastOptions().backdrop).toBe('static');
  });

  it('never closes while the commit is running, neither by Esc nor by the close button', async () => {
    await component.onFilesDropped(fileList(file));
    state.step.set(ClientImportStep.Preview);
    state.isCommitting.set(true);

    expect(lastOptions().beforeDismiss?.()).toBe(false);
    component.requestClose();

    expect(modalRefs[0].close).not.toHaveBeenCalled();
    expect(state.restart).not.toHaveBeenCalled();
  });

  it('closes when the user chooses another file', async () => {
    await component.onFilesDropped(fileList(file));

    component.onOtherFile();

    expect(modalRefs[0].close).toHaveBeenCalledTimes(1);
    expect(state.restart).toHaveBeenCalledTimes(1);
  });

  it('closes the modal and opens the employee list after the import', async () => {
    await component.onFilesDropped(fileList(file));
    state.step.set(ClientImportStep.Result);

    component.onToClientList();

    expect(modalRefs[0].close).toHaveBeenCalledTimes(1);
    expect(navigation.navigateToClient).toHaveBeenCalledTimes(1);
  });

  it('opens the manual as a stacked large, scrollable modal', async () => {
    await component.onFilesDropped(fileList(file));

    component.openManual();

    expect(modal.open).toHaveBeenCalledTimes(2);
    expect(lastOptions()).toMatchObject({
      size: 'lg',
      scrollable: true,
      ariaLabelledBy: CLIENT_IMPORT_MANUAL_MODAL_TITLE_ID,
    });
  });

  it('closes its modals when the card is destroyed', async () => {
    await component.onFilesDropped(fileList(file));
    state.step.set(ClientImportStep.Mapping);
    component.openManual();

    component.ngOnDestroy();

    expect(modalRefs[0].close).toHaveBeenCalled();
    expect(modalRefs[1].close).toHaveBeenCalled();
    expect(modalRefs[0].dismiss).not.toHaveBeenCalled();
  });

  it('switches to the manual tab when Klacksy points at the manual', () => {
    targetRequests.next({ target: 'client-import-manual' });

    expect(component.activeTab()).toBe(ClientImportPageTab.Manual);
  });

  it('brings the import tab back when Klacksy points at the drop zone while the manual is open', () => {
    component.setTab(ClientImportPageTab.Manual);

    targetRequests.next({ target: 'client-import-drop-zone' });

    expect(component.activeTab()).toBe(ClientImportPageTab.Import);
  });

  it('shows the drop zone, the only way into the modal, when Klacksy points at a modal step while it is closed', () => {
    component.setTab(ClientImportPageTab.Manual);

    targetRequests.next({ target: 'client-import-commit' });

    expect(component.activeTab()).toBe(ClientImportPageTab.Import);
    expect(modal.open).not.toHaveBeenCalled();
  });
});
