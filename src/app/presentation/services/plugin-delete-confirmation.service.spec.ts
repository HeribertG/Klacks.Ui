// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { PluginDeleteConfirmationService } from './plugin-delete-confirmation.service';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { ModalType } from 'src/app/presentation/modal/modal-type.enum';
import { DomainMessages } from 'src/app/domain/constants/messages';

describe('PluginDeleteConfirmationService', () => {
  let service: PluginDeleteConfirmationService;
  let modal: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PluginDeleteConfirmationService);
    modal = TestBed.inject(ModalService);
  });

  it('opens the shared delete modal with the default delete text for the requested subject', () => {
    // Arrange
    const openSpy = vi.spyOn(modal, 'openModel');

    // Act
    service.requestDelete('floor-plan-settings', 'plan-1');

    // Assert
    expect(modal.componentContext).toBe('floor-plan-settings');
    expect(modal.Filing).toBe('plan-1');
    expect(modal.deleteMessage).toBe(DomainMessages.DELETE_ENTRY);
    expect(openSpy).toHaveBeenCalledWith(ModalType.Delete);
  });

  it('emits the subject once the user confirms and resets the modal context', () => {
    // Arrange
    const confirmed: string[] = [];
    const subscription = service.confirmedDeletes('floor-plan-settings').subscribe((id) => confirmed.push(id));
    service.requestDelete('floor-plan-settings', 'plan-1');

    // Act
    modal.result(ModalType.Delete);
    TestBed.tick();

    // Assert
    expect(confirmed).toEqual(['plan-1']);
    expect(modal.componentContext).toBe('');
    expect(modal.Filing).toBe('');
    subscription.unsubscribe();
  });

  it('ignores confirmations requested under another context', () => {
    // Arrange
    const confirmed: string[] = [];
    const subscription = service.confirmedDeletes('floor-plan-settings').subscribe((id) => confirmed.push(id));
    service.requestDelete('other-plugin', 'x-1');

    // Act
    modal.result(ModalType.Delete);
    TestBed.tick();

    // Assert
    expect(confirmed).toEqual([]);
    expect(modal.componentContext).toBe('other-plugin');
    subscription.unsubscribe();
  });
});
