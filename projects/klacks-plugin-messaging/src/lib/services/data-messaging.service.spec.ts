// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Unit tests for DataMessagingService, focused on the request-building logic
 * (conditional query params for getMessages, repeated idNumbers query params
 * for previewBroadcastToIdNumbers) rather than plain HTTP pass-through calls.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLUGIN_API_BASE_URL } from 'klacks-plugin-contracts';
import { DataMessagingService } from './data-messaging.service';
import { MessageDirection } from '../enums/message-direction.enum';

const API_BASE_URL = 'https://plugin.test/api/';

describe('DataMessagingService', () => {
  let service: DataMessagingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLUGIN_API_BASE_URL, useValue: API_BASE_URL },
      ],
    });
    service = TestBed.inject(DataMessagingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('builds getMessages with only count and offset when no optional filters are given', () => {
    service.getMessages().subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}messaging/messages`,
    );
    expect(req.request.params.get('count')).toBe('50');
    expect(req.request.params.get('offset')).toBe('0');
    expect(req.request.params.has('providerId')).toBe(false);
    expect(req.request.params.has('direction')).toBe(false);
    expect(req.request.params.has('sender')).toBe(false);
    req.flush([]);
  });

  it('adds providerId, direction and sender params only when provided', () => {
    service.getMessages('provider-1', MessageDirection.Inbound, 'alice', 20, 10).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}messaging/messages`,
    );
    expect(req.request.params.get('providerId')).toBe('provider-1');
    expect(req.request.params.get('direction')).toBe(String(MessageDirection.Inbound));
    expect(req.request.params.get('sender')).toBe('alice');
    expect(req.request.params.get('count')).toBe('20');
    expect(req.request.params.get('offset')).toBe('10');
    req.flush([]);
  });

  it('includes direction 0 (Inbound) even though it is falsy', () => {
    service.getMessages(undefined, MessageDirection.Inbound).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}messaging/messages`,
    );
    expect(req.request.params.has('direction')).toBe(true);
    expect(req.request.params.get('direction')).toBe('0');
    req.flush([]);
  });

  it('appends one idNumbers query param per entry when previewing a broadcast by id numbers', () => {
    service.previewBroadcastToIdNumbers('telegram-main', [101, 102, 103]).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}messaging/broadcast/preview-by-id-numbers`,
    );
    expect(req.request.params.get('provider')).toBe('telegram-main');
    expect(req.request.params.getAll('idNumbers')).toEqual(['101', '102', '103']);
    req.flush({
      total: 3,
      withMessengerContact: 2,
      withPhoneFallback: 1,
      skipped: 0,
      providerSupportsPhoneFallback: true,
    });
  });

  it('sends no idNumbers param at all when the id number list is empty', () => {
    service.previewBroadcastToIdNumbers('telegram-main', []).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${API_BASE_URL}messaging/broadcast/preview-by-id-numbers`,
    );
    expect(req.request.params.has('idNumbers')).toBe(false);
    req.flush({
      total: 0,
      withMessengerContact: 0,
      withPhoneFallback: 0,
      skipped: 0,
      providerSupportsPhoneFallback: true,
    });
  });

  it('posts the broadcast send body with the default text contentType', () => {
    service.sendBroadcast('telegram-main', 'group-1', 'hello').subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}messaging/broadcast/send`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      provider: 'telegram-main',
      groupId: 'group-1',
      content: 'hello',
      contentType: 'text',
    });
    req.flush({ broadcastId: 'b-1', total: 1, sent: 1, failed: 0, skippedNoContact: 0 });
  });

  it('posts the send-to-id-numbers body with the id number list and fixed contentType', () => {
    service.sendBroadcastToIdNumbers('telegram-main', [7, 8], 'hi all').subscribe();

    const req = httpMock.expectOne(`${API_BASE_URL}messaging/broadcast/send-to-id-numbers`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      provider: 'telegram-main',
      idNumbers: [7, 8],
      content: 'hi all',
      contentType: 'text',
    });
    req.flush({ broadcastId: 'b-2', total: 2, sent: 2, failed: 0, skippedNoContact: 0 });
  });
});
