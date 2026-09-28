// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builds the source code link offered under AGPL-3.0 section 13. A release build links to the release tag
 * of exactly the running version (Api and Ui carry the same tag, set by scripts/release.ps1); a development
 * build has no tag and links to the repository itself.
 * @param repositoryUrl - Public repository URL without trailing slash
 * @param buildInfo - Build identity of the running bundle
 */
import { IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';
import { SOURCE_CODE_RELEASE_TAG_PREFIX, SOURCE_CODE_TREE_PATH } from 'src/app/domain/constants/source-code.constants';
import { isDevBuild } from './build-info.helper';

export function toSourceCodeUrl(repositoryUrl: string, buildInfo: IBuildInfo): string {
  if (isDevBuild(buildInfo)) {
    return repositoryUrl;
  }

  return `${repositoryUrl}${SOURCE_CODE_TREE_PATH}${SOURCE_CODE_RELEASE_TAG_PREFIX}${buildInfo.version}`;
}
