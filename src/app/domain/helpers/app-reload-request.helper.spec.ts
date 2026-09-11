// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { isSameReloadRequest, mergeReloadRequests } from './app-reload-request.helper';
import { AppReloadReason } from 'src/app/domain/enums/app-reload-reason.enum';
import { IAppReloadRequest } from 'src/app/domain/interfaces/app-reload-request.interface';

const TARGET_URL = '/workplace/schedule';
const OTHER_TARGET_URL = '/workplace/client';
const VERSION: IAppReloadRequest = { reason: AppReloadReason.Version, autoReloadAllowed: true };
const OUTAGE: IAppReloadRequest = { reason: AppReloadReason.Outage, autoReloadAllowed: true };
const CHUNK: IAppReloadRequest = { reason: AppReloadReason.Chunk, targetUrl: TARGET_URL, autoReloadAllowed: true };

describe('app reload request helper', () => {
  describe('mergeReloadRequests', () => {
    it('lets a new version outrank the end of an outage', () => {
      expect(mergeReloadRequests(OUTAGE, VERSION).reason).toBe(AppReloadReason.Version);
    });

    it('keeps a new version when an outage ends afterwards', () => {
      expect(mergeReloadRequests(VERSION, OUTAGE).reason).toBe(AppReloadReason.Version);
    });

    it('lets a chunk failure outrank a new version and keeps its target URL', () => {
      expect(mergeReloadRequests(VERSION, CHUNK)).toEqual(CHUNK);
    });

    it('keeps the known target URL when the same chunk failure is reported again without one', () => {
      const merged = mergeReloadRequests(CHUNK, { reason: AppReloadReason.Chunk, autoReloadAllowed: true });

      expect(merged.targetUrl).toBe(TARGET_URL);
    });

    it('takes the newer target URL for a second chunk failure', () => {
      const merged = mergeReloadRequests(CHUNK, { ...CHUNK, targetUrl: OTHER_TARGET_URL });

      expect(merged.targetUrl).toBe(OTHER_TARGET_URL);
    });

    it('forbids the automatic reload when either request forbids it', () => {
      expect(mergeReloadRequests(VERSION, { ...OUTAGE, autoReloadAllowed: false }).autoReloadAllowed).toBe(false);
      expect(mergeReloadRequests({ ...VERSION, autoReloadAllowed: false }, CHUNK).autoReloadAllowed).toBe(false);
    });
  });

  describe('isSameReloadRequest', () => {
    it('matches requests with equal reason, target URL and reload permission', () => {
      expect(isSameReloadRequest(CHUNK, { ...CHUNK })).toBe(true);
    });

    it.each([
      ['reason', { ...CHUNK, reason: AppReloadReason.Version }],
      ['target URL', { ...CHUNK, targetUrl: OTHER_TARGET_URL }],
      ['reload permission', { ...CHUNK, autoReloadAllowed: false }],
    ])('tells requests apart by %s', (_label, other) => {
      expect(isSameReloadRequest(CHUNK, other)).toBe(false);
    });
  });
});
