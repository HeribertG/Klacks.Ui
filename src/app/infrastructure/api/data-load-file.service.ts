// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for uploading, downloading, and deleting files (profile image, icon, logo, client images).
 * @param profileImage$ - Signal containing the Base64 profile image of the current user
 * @param iconImage$ - Signal containing the Base64 favicon/icon of the application
 * @param logoImage$ - Signal containing the Base64 logo of the application
 */

import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry, catchError } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataLoadFileService {
  public logoImage$ = signal<string | null>(null);
  public profileImage$ = signal<string | null>(null);
  public iconImage$ = signal<string | null>(null);

  public logoImageDimensions$ = signal<{
    width: number;
    height: number;
  } | null>(null);
  public profileImageDimensions$ = signal<{
    width: number;
    height: number;
  } | null>(null);
  public iconImageDimensions$ = signal<{
    width: number;
    height: number;
  } | null>(null);

  public lastError$ = signal<string | null>(null);

  private httpClient = inject(HttpClient);
  private destroyRef = inject(DestroyRef);

  upLoadFile(file: FormData) {
    return this.httpClient
      .post(`${environment.baseUrl}LoadFile/Upload/`, file)
      .pipe();
  }

  downLoadFile(type: string) {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + type, {
        responseType: 'blob',
      })
      .pipe(retry(3), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.createImageFromBlob(data);
        },
        error: (error) => {
          this.handleFileError('Failed to download file', error);
        },
      });
  }

  downLoadIcon() {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + 'own-icon.ico', {
        responseType: 'blob',
      })
      .pipe(retry(3), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.createIconFromBlob(data);
        },
        error: (error) => {
          this.handleFileError('Failed to download icon', error);
        },
      });
  }

  downLoadLogo() {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + 'own-logo.png', {
        responseType: 'blob',
      })
      .pipe(retry(3), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.createLogoFromBlob(data);
        },
        error: (error) => {
          this.handleFileError('Failed to download logo', error);
        },
      });
  }

  deleteIcon() {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + 'own-icon.ico')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.iconImage$.set(null);
        },
        error: (error) => {
          this.handleFileError('Failed to delete icon', error);
        },
      });
  }

  deleteLogo() {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + 'own-logo.png')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.logoImage$.set(null);
          this.logoImageDimensions$.set(null);
        },
        error: (error) => {
          this.handleFileError('Failed to delete logo', error);
        },
      });
  }

  deleteFile(type: string) {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + type)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.profileImage$.set(null);
        },
        error: (error) => {
          this.handleFileError('Failed to delete file', error);
        },
      });
  }

  calculateProportionalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth = 32,
    maxHeight = 32,
    absoluteMax = 40
  ): { width: number; height: number } {
    if (originalWidth === 0 || originalHeight === 0) {
      return { width: maxWidth, height: maxHeight };
    }

    const scaleX = maxWidth / originalWidth;
    const scaleY = maxHeight / originalHeight;

    const scale = Math.min(scaleX, scaleY);

    let newWidth = Math.round(originalWidth * scale);
    let newHeight = Math.round(originalHeight * scale);

    if (newWidth > absoluteMax) {
      const absoluteScale = absoluteMax / newWidth;
      newWidth = absoluteMax;
      newHeight = Math.round(newHeight * absoluteScale);
    }

    if (newHeight > absoluteMax) {
      const absoluteScale = absoluteMax / newHeight;
      newHeight = absoluteMax;
      newWidth = Math.round(newWidth * absoluteScale);
    }

    return { width: newWidth, height: newHeight };
  }

  uploadClientImage(clientId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.httpClient.post(
      `${environment.baseUrl}LoadFile/client/${clientId}/upload`,
      formData
    );
  }

  downloadClientImage(clientId: string): Observable<Blob> {
    return this.httpClient.get(
      `${environment.baseUrl}LoadFile/client/${clientId}/download`,
      { responseType: 'blob' }
    ).pipe(
      catchError((error) => {
        if (error.status === 404) {
          return of(new Blob());
        }
        return throwError(() => error);
      })
    );
  }

  deleteClientImage(clientId: string) {
    return this.httpClient.delete(
      `${environment.baseUrl}LoadFile/client/${clientId}`
    );
  }

  clearAllImages(): void {
    this.profileImage$.set(null);
    this.iconImage$.set(null);
    this.logoImage$.set(null);

    this.profileImageDimensions$.set(null);
    this.iconImageDimensions$.set(null);
    this.logoImageDimensions$.set(null);
  }

  private handleFileError(context: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.lastError$.set(`${context}: ${message}`);
    console.error(context, error);
  }

  private createImageFromBlob(image: Blob) {
    this.convertBlobToDataUrl(image, {
      onClear: () => {
        this.profileImage$.set(null);
      },
      onLoad: (result) => {
        this.profileImage$.set(result);
      },
    });
  }

  private createIconFromBlob(image: Blob) {
    this.convertBlobToDataUrl(image, {
      onClear: () => {
        this.iconImage$.set(null);
      },
      onLoad: (result) => {
        this.iconImage$.set(result);

        const favicon =
          (document.getElementById('appIcon') as HTMLLinkElement) ||
          (document.querySelector('link[rel="icon"]') as HTMLLinkElement) ||
          (document.querySelector(
            'link[rel="shortcut icon"]'
          ) as HTMLLinkElement) ||
          (document.querySelector(
            'link[rel="apple-touch-icon"]'
          ) as HTMLLinkElement);

        if (favicon) {
          favicon.href = result;
        }
      },
    });
  }

  private createLogoFromBlob(image: Blob) {
    this.convertBlobToDataUrl(image, {
      onClear: () => {
        this.logoImage$.set(null);
        this.logoImageDimensions$.set(null);
      },
      onLoad: (result) => {
        this.logoImage$.set(result);

        this.getImageDimensions(result).then((dimensions) => {
          this.logoImageDimensions$.set(dimensions);
        });
      },
    });
  }

  private convertBlobToDataUrl(
    blob: Blob,
    callbacks: { onClear: () => void; onLoad: (result: string) => void }
  ) {
    if (blob.type === 'text/plain') {
      callbacks.onClear();
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        callbacks.onLoad(reader.result as string);
      },
      false
    );

    if (blob) {
      reader.readAsDataURL(blob);
    }
  }

  private getImageDimensions(
    src: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = src;
    });
  }
}
