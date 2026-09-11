// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { isDevBuild, parseBuildInfo, toDisplayVersion } from './build-info.helper';
import { DEV_BUILD_KEY, DEV_BUILD_VERSION } from 'src/app/domain/constants/build-info.constants';
import { IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';

const RELEASE_BUILD: IBuildInfo = { version: '1.0.28', buildKey: '9a7e4b1c0d2f' };
const DEV_BUILD: IBuildInfo = { version: DEV_BUILD_VERSION, buildKey: DEV_BUILD_KEY };

describe('build-info helper', () => {
  describe('isDevBuild', () => {
    it('recognises a development build by its build key', () => {
      expect(isDevBuild(DEV_BUILD)).toBe(true);
    });

    it('treats a build with a commit SHA as a release build', () => {
      expect(isDevBuild(RELEASE_BUILD)).toBe(false);
    });
  });

  describe('toDisplayVersion', () => {
    it('shows the release version of a release build', () => {
      expect(toDisplayVersion(RELEASE_BUILD)).toBe('1.0.28');
    });

    it('shows nothing for a development build', () => {
      expect(toDisplayVersion(DEV_BUILD)).toBe('');
    });
  });

  describe('parseBuildInfo', () => {
    it('accepts a version file with version and build key and drops unknown fields', () => {
      expect(parseBuildInfo({ version: '1.0.28', buildKey: '9a7e4b1c0d2f', extra: true })).toEqual(RELEASE_BUILD);
    });

    it.each([
      ['null', null],
      ['an HTML page', '<!doctype html>'],
      ['an object without build key', { version: '1.0.28' }],
      ['an empty build key', { version: '1.0.28', buildKey: '' }],
      ['a numeric version', { version: 128, buildKey: '9a7e4b1c0d2f' }],
    ])('rejects %s', (_label, value) => {
      expect(parseBuildInfo(value)).toBeNull();
    });
  });
});
