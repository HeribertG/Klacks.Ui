// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DraftRecoveryService } from './draft-recovery.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { SessionStorageService } from 'src/app/infrastructure/storage/session-storage.service';

const ROUTE = '/workplace/edit-shift/123';

describe('DraftRecoveryService', () => {
  let service: DraftRecoveryService;
  let manager: any;
  let workplaceState: any;
  let sessionStorage: any;
  let router: any;
  let ngbModal: any;

  function setup(): void {
    workplaceState = { activeManager: () => manager };
    sessionStorage = {
      saveFilter: vi.fn().mockResolvedValue(true),
      restoreFilter: vi.fn().mockResolvedValue(null),
      removeFilter: vi.fn().mockResolvedValue(true),
    };
    router = { url: ROUTE };
    ngbModal = {
      open: vi.fn().mockReturnValue({ result: Promise.resolve(true) }),
    };

    TestBed.configureTestingModule({
      providers: [
        DraftRecoveryService,
        { provide: WorkplaceStateService, useValue: workplaceState },
        { provide: SessionStorageService, useValue: sessionStorage },
        { provide: Router, useValue: router },
        { provide: NgbModal, useValue: ngbModal },
      ],
    });

    service = TestBed.inject(DraftRecoveryService);
  }

  describe('capture', () => {
    it('stores the draft of a draftable, dirty manager', () => {
      manager = {
        captureDraft: vi.fn().mockReturnValue({ id: '1', name: 'Test' }),
        restoreDraft: vi.fn(),
      };
      setup();

      service.capture();

      expect(sessionStorage.saveFilter).toHaveBeenCalledTimes(1);
      const [key, payload] = sessionStorage.saveFilter.mock.calls[0];
      expect(key).toBe('draft-recovery');
      expect(payload.routeUrl).toBe(ROUTE);
      expect(payload.draft).toEqual({ id: '1', name: 'Test' });
      expect(typeof payload.ts).toBe('number');
    });

    it('does nothing when the active manager is not draftable', () => {
      manager = { areObjectsDirty: vi.fn() };
      setup();

      service.capture();

      expect(sessionStorage.saveFilter).not.toHaveBeenCalled();
    });

    it('does not store when captureDraft returns null', () => {
      manager = {
        captureDraft: vi.fn().mockReturnValue(null),
        restoreDraft: vi.fn(),
      };
      setup();

      service.capture();

      expect(sessionStorage.saveFilter).not.toHaveBeenCalled();
    });
  });

  describe('offerRestore', () => {
    beforeEach(() => {
      manager = {
        captureDraft: vi.fn(),
        restoreDraft: vi.fn(),
      };
    });

    it('opens the dialog and restores on confirm for a fresh, matching draft', async () => {
      setup();
      sessionStorage.restoreFilter.mockResolvedValue({
        routeUrl: ROUTE,
        draft: { id: '1' },
        ts: Date.now(),
      });

      service.offerRestore();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(ngbModal.open).toHaveBeenCalledTimes(1);
      expect(sessionStorage.removeFilter).toHaveBeenCalledWith('draft-recovery');
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(manager.restoreDraft).toHaveBeenCalledWith({ id: '1' });
    });

    it('does not restore when the dialog is dismissed', async () => {
      setup();
      ngbModal.open.mockReturnValue({ result: Promise.reject('dismissed') });
      sessionStorage.restoreFilter.mockResolvedValue({
        routeUrl: ROUTE,
        draft: { id: '1' },
        ts: Date.now(),
      });

      service.offerRestore();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(ngbModal.open).toHaveBeenCalledTimes(1);
      expect(manager.restoreDraft).not.toHaveBeenCalled();
    });

    it('does not offer when the stored route does not match the current route', async () => {
      setup();
      sessionStorage.restoreFilter.mockResolvedValue({
        routeUrl: '/workplace/edit-shift/999',
        draft: { id: '1' },
        ts: Date.now(),
      });

      service.offerRestore();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(ngbModal.open).not.toHaveBeenCalled();
      expect(sessionStorage.removeFilter).not.toHaveBeenCalled();
    });

    it('discards a stale draft without offering', async () => {
      setup();
      sessionStorage.restoreFilter.mockResolvedValue({
        routeUrl: ROUTE,
        draft: { id: '1' },
        ts: Date.now() - 31 * 60 * 1000,
      });

      service.offerRestore();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(sessionStorage.removeFilter).toHaveBeenCalledWith('draft-recovery');
      expect(ngbModal.open).not.toHaveBeenCalled();
    });

    it('does nothing when no draft is stored', async () => {
      setup();
      sessionStorage.restoreFilter.mockResolvedValue(null);

      service.offerRestore();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(ngbModal.open).not.toHaveBeenCalled();
      expect(sessionStorage.removeFilter).not.toHaveBeenCalled();
    });
  });
});
