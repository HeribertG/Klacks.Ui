// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Reads the build identity of the currently deployed UI from version.json, which the Docker build
 * writes next to index.html. Uses fetch instead of HttpClient on purpose: the file is static, needs
 * no authentication and must never trigger error toasts, the loading spinner or the backend-outage
 * detection of the HTTP interceptors. Bypasses the HTTP cache and gives up after a timeout; any
 * failure yields null.
 */
import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { IAppVersionSource } from 'src/app/domain/interfaces/app-version-source.interface';
import { IBuildInfo } from 'src/app/domain/interfaces/build-info.interface';
import { parseBuildInfo } from 'src/app/domain/helpers/build-info.helper';

const VERSION_FILE_NAME = 'version.json';
const FETCH_TIMEOUT_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class DataAppVersionService implements IAppVersionSource {
  private readonly document = inject(DOCUMENT);

  async fetchDeployedBuildInfo(): Promise<IBuildInfo | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(this.versionFileUrl(), { cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        return null;
      }
      return parseBuildInfo(await response.json());
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private versionFileUrl(): string {
    return new URL(VERSION_FILE_NAME, this.document.baseURI).toString();
  }
}
