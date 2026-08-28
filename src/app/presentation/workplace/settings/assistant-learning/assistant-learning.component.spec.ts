// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';

import { AssistantLearningComponent } from './assistant-learning.component';
import { DataManagementKlacksyLearningService } from 'src/app/domain/services/assistant/data-management-klacksy-learning.service';
import {
  ILearnedCapability,
  ILearnedPhrase,
  IUnfulfillableWish,
} from 'src/app/domain/interfaces/klacksy-learning.interface';
import {
  KLACKSY_LEARNING_DELETE_CONTEXT,
  KLACKSY_LEARNING_RUN_REASON,
  KLACKSY_LEARNING_RUN_RELOAD_DELAY_MS,
} from 'src/app/domain/constants/klacksy-learning.constants';
import { ModalService, ModalType } from 'src/app/presentation/modal/modal.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';

describe('AssistantLearningComponent', () => {
  let component: AssistantLearningComponent;
  let fixture: ComponentFixture<AssistantLearningComponent>;
  let mockLearningService: any;
  let mockToastService: any;
  let mockModalService: any;
  let mockTranslateService: any;

  const spyOnModalOpen = () =>
    vi
      .spyOn((component as any).ngbModal, 'open')
      .mockReturnValue({ close: vi.fn(), dismiss: vi.fn() } as any);

  const learnedPhrase: ILearnedPhrase = {
    id: 'phrase-1',
    skillName: 'search_employees',
    language: 'de',
    phrase: 'wer arbeitet heute',
    learnedAt: '2026-08-28T06:00:00Z',
    quote: 0.83,
    uses: 12,
    source: 'learned',
    status: 'active',
  };

  const descriptionPhrase: ILearnedPhrase = {
    id: 'proposal-1',
    skillName: 'list_absences',
    language: 'und',
    phrase: 'Lists absences of a single employee.',
    learnedAt: '2026-08-27T06:00:00Z',
    quote: null,
    uses: null,
    source: 'description',
    status: 'pending',
  };

  const appliedAutoPhrase: ILearnedPhrase = {
    id: 'proposal-2',
    skillName: 'list_shifts',
    language: 'und',
    phrase: 'Lists the shifts of a single day.',
    learnedAt: '2026-08-27T06:00:00Z',
    quote: null,
    uses: null,
    source: 'description',
    status: 'applied_auto',
  };

  const blockedPhrase: ILearnedPhrase = {
    id: 'proposal-3',
    skillName: 'search_clients',
    language: 'und',
    phrase: 'Finds clients by name or reference.',
    learnedAt: '2026-08-27T06:00:00Z',
    quote: null,
    uses: null,
    source: 'description',
    status: 'blocked_regression',
  };

  const allPhrases: ILearnedPhrase[] = [
    learnedPhrase,
    descriptionPhrase,
    appliedAutoPhrase,
    blockedPhrase,
  ];

  const capability: ILearnedCapability = {
    id: 'capability-1',
    name: 'weekly_absence_digest',
    goal: 'Summarise the absences of the current week',
    steps: [
      { skill: 'get_current_time', kind: 'search' },
      { skill: 'list_absences', kind: 'search' },
    ],
    learnedAt: '2026-08-28T06:00:00Z',
    quote: null,
    uses: null,
    needsFirstUse: true,
  };

  const wish: IUnfulfillableWish = {
    id: 'cluster-1',
    intentExcerpt: 'Schick mir das als Fax',
    locale: 'de',
    status: 'unfulfillable',
    occurrenceCount: 5,
    distinctUserCount: 3,
    firstSeen: '2026-08-20T06:00:00Z',
    lastSeen: '2026-08-27T06:00:00Z',
    lastError: null,
  };

  const readyWish: IUnfulfillableWish = {
    id: 'cluster-2',
    intentExcerpt: 'Zeig mir die Dienste als Karte',
    locale: 'de',
    status: 'ready',
    occurrenceCount: 4,
    distinctUserCount: 2,
    firstSeen: '2026-08-22T06:00:00Z',
    lastSeen: '2026-08-27T06:00:00Z',
    lastError: null,
  };

  const allWishes: IUnfulfillableWish[] = [wish, readyWish];

  beforeEach(async () => {
    const learningServiceSpy = {
      getPhrases: vi.fn().mockReturnValue(of(allPhrases)),
      updatePhrase: vi.fn().mockReturnValue(of(undefined)),
      deletePhrase: vi.fn().mockReturnValue(of(undefined)),
      approveDescriptionProposal: vi
        .fn()
        .mockReturnValue(of({ applied: true, error: null, newSkillVersion: 4 })),
      getCapabilities: vi.fn().mockReturnValue(of([capability])),
      updateCapability: vi.fn().mockReturnValue(of(undefined)),
      deleteCapability: vi.fn().mockReturnValue(of(undefined)),
      getUnfulfillableWishes: vi.fn().mockReturnValue(of(allWishes)),
      dismissUnfulfillableWish: vi.fn().mockReturnValue(of(undefined)),
      retryUnfulfillableWish: vi.fn().mockReturnValue(of(undefined)),
      runLearning: vi.fn().mockReturnValue(of({ started: true, reason: null })),
    };

    const toastServiceSpy = {
      showError: vi.fn(),
      showSuccess: vi.fn(),
      showInfo: vi.fn(),
    };

    const modalServiceSpy: any = {
      Filing: '',
      componentContext: '',
      deleteMessage: '',
      openModel: vi.fn(),
      setDefault: vi.fn(),
      resultEvent: new Subject<ModalType>(),
    };

    const ngbModalSpy = {
      open: vi.fn(),
    };

    const translateServiceSpy = {
      instant: vi.fn().mockReturnValue('Translated text'),
      get: vi.fn().mockReturnValue(of('Translated text')),
      onTranslationChange: of(),
      onLangChange: of(),
      onDefaultLangChange: of(),
    };

    await TestBed.configureTestingModule({
      imports: [AssistantLearningComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementKlacksyLearningService, useValue: learningServiceSpy },
        { provide: ToastShowService, useValue: toastServiceSpy },
        { provide: ModalService, useValue: modalServiceSpy },
        { provide: NgbModal, useValue: ngbModalSpy },
        { provide: TranslateService, useValue: translateServiceSpy },
      ],
    }).compileComponents();

    mockLearningService = TestBed.inject(DataManagementKlacksyLearningService) as any;
    mockToastService = TestBed.inject(ToastShowService) as any;
    mockModalService = TestBed.inject(ModalService) as any;
    mockTranslateService = TestBed.inject(TranslateService) as any;

    fixture = TestBed.createComponent(AssistantLearningComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initialization', () => {
    it('loads all three lists on init', () => {
      fixture.detectChanges();

      expect(mockLearningService.getPhrases).toHaveBeenCalled();
      expect(mockLearningService.getCapabilities).toHaveBeenCalled();
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalled();
      expect(component.phrases().length).toBe(4);
      expect(component.capabilities().length).toBe(1);
      expect(component.wishes().length).toBe(2);
    });

    it('keeps the phrase list empty and reports an error when loading fails', () => {
      mockLearningService.getPhrases.mockReturnValue(throwError(() => new Error('load failed')));

      fixture.detectChanges();

      expect(component.phrases().length).toBe(0);
      expect(component.isLoading()).toBe(false);
      expect(mockToastService.showError).toHaveBeenCalled();
    });

    it('renders the empty state of every list when the backend returns nothing', () => {
      mockLearningService.getPhrases.mockReturnValue(of([]));
      mockLearningService.getCapabilities.mockReturnValue(of([]));
      mockLearningService.getUnfulfillableWishes.mockReturnValue(of([]));

      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      expect(html.querySelector('#learned-phrases-empty')).toBeTruthy();
      expect(html.querySelector('#learned-capabilities-empty')).toBeTruthy();
      expect(html.querySelector('#unfulfillable-wishes-empty')).toBeTruthy();
    });
  });

  describe('Edit modal', () => {
    it('opens the phrase modal and prefills the form with the phrase', () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      const openSpy = spyOnModalOpen();

      component.onClickEditPhrase(learnedPhrase);
      vi.advanceTimersByTime(10);

      expect(component.editingPhrase()).toEqual(learnedPhrase);
      expect(component.isDescriptionPhrase()).toBe(false);
      expect(openSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('marks a description sharpening so the modal edits the description', () => {
      vi.useFakeTimers();
      fixture.detectChanges();
      spyOnModalOpen();

      component.onClickEditPhrase(descriptionPhrase);
      vi.advanceTimersByTime(10);

      expect(component.isDescriptionPhrase()).toBe(true);
      vi.useRealTimers();
    });

    it('sends a phrase body when a learned phrase is saved', async () => {
      fixture.detectChanges();
      const modal = { close: vi.fn() };
      component.editingPhrase.set(learnedPhrase);
      (component as any).phraseFormModel.set({ text: 'wer hat heute Dienst' });

      await component.onSavePhraseModal(modal);

      expect(mockLearningService.updatePhrase).toHaveBeenCalledWith('phrase-1', {
        phrase: 'wer hat heute Dienst',
      });
      expect(modal.close).toHaveBeenCalled();
    });

    it('sends a description body when a description sharpening is saved', async () => {
      fixture.detectChanges();
      const modal = { close: vi.fn() };
      component.editingPhrase.set(descriptionPhrase);
      (component as any).phraseFormModel.set({ text: 'Lists absences.' });

      await component.onSavePhraseModal(modal);

      expect(mockLearningService.updatePhrase).toHaveBeenCalledWith('proposal-1', {
        description: 'Lists absences.',
      });
    });

    it('does not save and keeps the modal open when the text is too short', async () => {
      fixture.detectChanges();
      const modal = { close: vi.fn() };
      component.editingPhrase.set(learnedPhrase);
      (component as any).phraseFormModel.set({ text: 'ab' });

      await component.onSavePhraseModal(modal);

      expect(mockLearningService.updatePhrase).not.toHaveBeenCalled();
      expect(modal.close).not.toHaveBeenCalled();
    });

    it('sends only the goal when a capability is saved', async () => {
      fixture.detectChanges();
      const modal = { close: vi.fn() };
      component.editingCapability.set(capability);
      (component as any).capabilityFormModel.set({ goal: 'Summarise this week' });

      await component.onSaveCapabilityModal(modal);

      expect(mockLearningService.updateCapability).toHaveBeenCalledWith('capability-1', {
        goal: 'Summarise this week',
      });
    });

    it('reports an error and keeps the modal open when saving fails', async () => {
      mockLearningService.updatePhrase.mockReturnValue(throwError(() => new Error('save failed')));
      fixture.detectChanges();
      const modal = { close: vi.fn() };
      component.editingPhrase.set(learnedPhrase);
      (component as any).phraseFormModel.set({ text: 'wer hat heute Dienst' });

      await component.onSavePhraseModal(modal);

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(modal.close).not.toHaveBeenCalled();
    });
  });

  describe('Delete confirmation', () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('opens the shared delete modal with the phrase context', () => {
      fixture.detectChanges();

      component.onClickDeletePhrase(learnedPhrase);

      expect(mockModalService.componentContext).toBe(KLACKSY_LEARNING_DELETE_CONTEXT.Phrases);
      expect(mockModalService.Filing).toBe('phrase-1');
      expect(mockModalService.openModel).toHaveBeenCalledWith(ModalType.Delete);
    });

    it('removes the phrase only after the delete modal was confirmed', async () => {
      fixture.detectChanges();
      component.onClickDeletePhrase(learnedPhrase);

      expect(mockLearningService.deletePhrase).not.toHaveBeenCalled();

      mockModalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(mockLearningService.deletePhrase).toHaveBeenCalledWith('phrase-1');
      expect(component.phrases().map((entry) => entry.id)).toEqual([
        'proposal-1',
        'proposal-2',
        'proposal-3',
      ]);
    });

    it('deletes a capability under its own context', async () => {
      fixture.detectChanges();
      component.onClickDeleteCapability(capability);

      expect(mockModalService.componentContext).toBe(KLACKSY_LEARNING_DELETE_CONTEXT.Capabilities);

      mockModalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(mockLearningService.deleteCapability).toHaveBeenCalledWith('capability-1');
      expect(component.capabilities().length).toBe(0);
    });

    it('dismisses an unfulfillable wish under its own context', async () => {
      fixture.detectChanges();
      component.onClickDeleteWish(wish);

      expect(mockModalService.componentContext).toBe(KLACKSY_LEARNING_DELETE_CONTEXT.Wishes);

      mockModalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(mockLearningService.dismissUnfulfillableWish).toHaveBeenCalledWith('cluster-1');
      expect(component.wishes().map((entry) => entry.id)).toEqual(['cluster-2']);
    });

    it('reports the stale description as information and refetches instead of removing the row', async () => {
      mockLearningService.deletePhrase.mockReturnValue(
        throwError(() => ({ status: 409, error: { error: 'description changed meanwhile' } })),
      );
      fixture.detectChanges();
      component.onClickDeletePhrase(appliedAutoPhrase);

      mockModalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(mockToastService.showInfo).toHaveBeenCalled();
      expect(mockToastService.showError).not.toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.phrases.deleteStale',
      );
      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(2);
      expect(component.phrases().length).toBe(4);
    });

    it('reports an error and keeps the row when deleting fails', async () => {
      mockLearningService.deletePhrase.mockReturnValue(throwError(() => new Error('delete failed')));
      fixture.detectChanges();
      component.onClickDeletePhrase(learnedPhrase);

      mockModalService.resultEvent.next(ModalType.Delete);
      await flush();

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(component.phrases().length).toBe(4);
    });
  });

  describe('Status column', () => {
    it('renders a status cell for every row and marks it with the class of its status', () => {
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      const badgeClass = (id: string) =>
        html.querySelector(`#learned-phrases-row-status-${id} .badge`)?.className ?? '';

      expect(html.querySelectorAll('[id^="learned-phrases-row-status-"]').length).toBe(4);
      expect(badgeClass('phrase-1')).toContain('badge-status-active');
      expect(badgeClass('proposal-1')).toContain('badge-status-pending');
      expect(badgeClass('proposal-2')).toContain('badge-status-applied-auto');
      expect(badgeClass('proposal-3')).toContain('badge-status-blocked');
    });

    it('keeps the delete action on an automatically applied row so it can be reverted', () => {
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      expect(html.querySelector('#learned-phrases-row-delete-proposal-2')).toBeTruthy();
    });
  });

  describe('Approve description sharpening', () => {
    it('offers the approve action only on a row the regression gate blocked', () => {
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      expect(html.querySelector('#learned-phrases-row-approve-proposal-3')).toBeTruthy();
      expect(html.querySelector('#learned-phrases-row-approve-proposal-1')).toBeFalsy();
      expect(html.querySelector('#learned-phrases-row-approve-proposal-2')).toBeFalsy();
      expect(html.querySelector('#learned-phrases-row-approve-phrase-1')).toBeFalsy();
    });

    it('approves the proposal under the id of the row and reloads the phrase list', async () => {
      fixture.detectChanges();

      await component.onClickApprovePhrase(blockedPhrase);

      expect(mockLearningService.approveDescriptionProposal).toHaveBeenCalledWith('proposal-3');
      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(2);
      expect(mockToastService.showSuccess).toHaveBeenCalled();
      expect(mockToastService.showError).not.toHaveBeenCalled();
    });

    it('ignores an approve request for a row the gate never blocked', async () => {
      fixture.detectChanges();

      await component.onClickApprovePhrase(descriptionPhrase);
      await component.onClickApprovePhrase(appliedAutoPhrase);
      await component.onClickApprovePhrase(learnedPhrase);

      expect(mockLearningService.approveDescriptionProposal).not.toHaveBeenCalled();
    });

    it('reports an error and does not reload when the endpoint rejects the proposal', async () => {
      mockLearningService.approveDescriptionProposal.mockReturnValue(
        throwError(() => ({ status: 400, error: { error: 'cannot approve' } })),
      );
      fixture.detectChanges();

      await component.onClickApprovePhrase(blockedPhrase);

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(1);
    });

    it('reports an error when the endpoint answers that nothing was applied', async () => {
      mockLearningService.approveDescriptionProposal.mockReturnValue(
        of({ applied: false, error: 'Proposal not found.', newSkillVersion: null }),
      );
      fixture.detectChanges();

      await component.onClickApprovePhrase(blockedPhrase);

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockToastService.showSuccess).not.toHaveBeenCalled();
      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(1);
    });

    it('ignores a second click while an approval is still running', async () => {
      fixture.detectChanges();

      await Promise.all([
        component.onClickApprovePhrase(blockedPhrase),
        component.onClickApprovePhrase(blockedPhrase),
      ]);

      expect(mockLearningService.approveDescriptionProposal).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retry unfulfillable wish', () => {
    it('offers the retry action only on a row the loop gave up on', () => {
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      expect(html.querySelector('#unfulfillable-wishes-row-retry-cluster-1')).toBeTruthy();
      expect(html.querySelector('#unfulfillable-wishes-row-retry-cluster-2')).toBeFalsy();
    });

    it('keeps the delete action on both rows', () => {
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      expect(html.querySelector('#unfulfillable-wishes-row-delete-cluster-1')).toBeTruthy();
      expect(html.querySelector('#unfulfillable-wishes-row-delete-cluster-2')).toBeTruthy();
    });

    it('retries under the id of the row and refetches the wish list', async () => {
      fixture.detectChanges();

      await component.onClickRetryWish(wish);

      expect(mockLearningService.retryUnfulfillableWish).toHaveBeenCalledWith('cluster-1');
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalledTimes(2);
      expect(mockToastService.showSuccess).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.wishes.retrySuccess',
      );
      expect(mockToastService.showError).not.toHaveBeenCalled();
    });

    it('ignores a retry for a wish that is still waiting to be picked up', async () => {
      fixture.detectChanges();

      await component.onClickRetryWish(readyWish);

      expect(mockLearningService.retryUnfulfillableWish).not.toHaveBeenCalled();
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalledTimes(1);
    });

    it('reports an error and does not refetch when the endpoint rejects the status', async () => {
      mockLearningService.retryUnfulfillableWish.mockReturnValue(
        throwError(() => ({ status: 400, error: { error: 'wrong status' } })),
      );
      fixture.detectChanges();

      await component.onClickRetryWish(wish);

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.wishes.retryError',
      );
      expect(mockToastService.showSuccess).not.toHaveBeenCalled();
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalledTimes(1);
    });

    it('reports an error and does not refetch when the wish is gone', async () => {
      mockLearningService.retryUnfulfillableWish.mockReturnValue(
        throwError(() => ({ status: 404 })),
      );
      fixture.detectChanges();

      await component.onClickRetryWish(wish);

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalledTimes(1);
    });

    it('ignores a second click while a retry is still running', async () => {
      fixture.detectChanges();

      await Promise.all([component.onClickRetryWish(wish), component.onClickRetryWish(wish)]);

      expect(mockLearningService.retryUnfulfillableWish).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual learning run', () => {
    it('renders the run button in the card head next to the reload button', () => {
      fixture.detectChanges();

      const html = fixture.nativeElement as HTMLElement;
      expect(html.querySelector('#assistant-learning-run-btn')).toBeTruthy();
      expect(html.querySelector('#assistant-learning-reload-btn')).toBeTruthy();
    });

    it('starts the run, reports it and refetches the lists after the grace period', async () => {
      vi.useFakeTimers();
      fixture.detectChanges();

      await component.onClickRunLearning();

      expect(mockLearningService.runLearning).toHaveBeenCalledTimes(1);
      expect(mockToastService.showSuccess).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.runStarted',
      );
      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(KLACKSY_LEARNING_RUN_RELOAD_DELAY_MS);

      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(2);
      expect(mockLearningService.getCapabilities).toHaveBeenCalledTimes(2);
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalledTimes(2);
      vi.useRealTimers();
    });

    it('shows an info toast with the mapped text when a run was already in progress', async () => {
      mockLearningService.runLearning.mockReturnValue(
        of({ started: false, reason: KLACKSY_LEARNING_RUN_REASON.AlreadyRunning }),
      );
      fixture.detectChanges();

      await component.onClickRunLearning();

      expect(mockToastService.showInfo).toHaveBeenCalled();
      expect(mockToastService.showSuccess).not.toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.runNotStarted.alreadyRunning',
      );
      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(1);
    });

    it('falls back to the generic text for a reason it does not know', async () => {
      mockLearningService.runLearning.mockReturnValue(
        of({ started: false, reason: 'Something else entirely.' }),
      );
      fixture.detectChanges();

      await component.onClickRunLearning();

      expect(mockToastService.showInfo).toHaveBeenCalled();
      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.runNotStarted.generic',
      );
    });

    it('falls back to the generic text when no reason is given at all', async () => {
      mockLearningService.runLearning.mockReturnValue(of({ started: false, reason: null }));
      fixture.detectChanges();

      await component.onClickRunLearning();

      expect(mockTranslateService.instant).toHaveBeenCalledWith(
        'setting.klacksyLearning.runNotStarted.generic',
      );
    });

    it('reports an error and does not refetch when the run endpoint fails', async () => {
      vi.useFakeTimers();
      mockLearningService.runLearning.mockReturnValue(
        throwError(() => ({ status: 500, error: 'boom' })),
      );
      fixture.detectChanges();

      await component.onClickRunLearning();

      expect(mockToastService.showError).toHaveBeenCalled();
      expect(mockToastService.showSuccess).not.toHaveBeenCalled();

      vi.advanceTimersByTime(KLACKSY_LEARNING_RUN_RELOAD_DELAY_MS);

      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(1);
      expect(component.isRunningLearning()).toBe(false);
      vi.useRealTimers();
    });

    it('ignores a second click while a run trigger is still in flight', async () => {
      fixture.detectChanges();

      await Promise.all([component.onClickRunLearning(), component.onClickRunLearning()]);

      expect(mockLearningService.runLearning).toHaveBeenCalledTimes(1);
    });

    it('disables the run button while a run trigger is in flight', () => {
      fixture.detectChanges();
      const html = fixture.nativeElement as HTMLElement;
      const button = html.querySelector('#assistant-learning-run-btn') as HTMLButtonElement;
      expect(button.disabled).toBe(false);

      component.isRunningLearning.set(true);
      fixture.detectChanges();

      expect(button.disabled).toBe(true);
    });
  });

  describe('Reload', () => {
    it('refetches all three lists', () => {
      fixture.detectChanges();

      component.loadAll();

      expect(mockLearningService.getPhrases).toHaveBeenCalledTimes(2);
      expect(mockLearningService.getCapabilities).toHaveBeenCalledTimes(2);
      expect(mockLearningService.getUnfulfillableWishes).toHaveBeenCalledTimes(2);
    });
  });
});
