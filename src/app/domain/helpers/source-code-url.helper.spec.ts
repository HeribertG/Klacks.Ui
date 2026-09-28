// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { toSourceCodeUrl } from './source-code-url.helper';
import { DEV_BUILD_KEY, DEV_BUILD_VERSION } from 'src/app/domain/constants/build-info.constants';
import { SOURCE_CODE_API_REPOSITORY_URL } from 'src/app/domain/constants/source-code.constants';
import { IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';

const RELEASE_BUILD: IBuildInfo = { version: '1.0.36', buildKey: '9a7e4b1c0d2f' };
const DEV_BUILD: IBuildInfo = { version: DEV_BUILD_VERSION, buildKey: DEV_BUILD_KEY };

describe('toSourceCodeUrl', () => {
  it('links a release build to the release tag of the running version', () => {
    expect(toSourceCodeUrl(SOURCE_CODE_API_REPOSITORY_URL, RELEASE_BUILD)).toBe(
      'https://github.com/HeribertG/Klacks.Api/tree/v1.0.36',
    );
  });

  it('links a development build to the repository because it has no release tag', () => {
    expect(toSourceCodeUrl(SOURCE_CODE_API_REPOSITORY_URL, DEV_BUILD)).toBe(SOURCE_CODE_API_REPOSITORY_URL);
  });
});
