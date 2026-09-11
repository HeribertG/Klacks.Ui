// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Pure helpers around the build identity of the running bundle and of the deployed version file.
 * @param buildInfo - Version number and build key of a build
 * @param value - Parsed body of version.json, validated before it is trusted
 */
import { IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';
import { DEV_BUILD_KEY } from 'src/app/domain/constants/build-info.constants';

export function isDevBuild(buildInfo: IBuildInfo): boolean {
  return buildInfo.buildKey === DEV_BUILD_KEY;
}

export function toDisplayVersion(buildInfo: IBuildInfo): string {
  return isDevBuild(buildInfo) ? '' : buildInfo.version;
}

export function parseBuildInfo(value: unknown): IBuildInfo | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { version?: unknown; buildKey?: unknown };
  if (typeof candidate.version !== 'string' || typeof candidate.buildKey !== 'string' || candidate.buildKey === '') {
    return null;
  }

  return { version: candidate.version, buildKey: candidate.buildKey };
}
