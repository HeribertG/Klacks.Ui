// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry, catchError } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataLoadFileService {
  profileImage: any;
  iconImage: any;
  logoImage: any;

  public logoImage$ = signal<string | null>(null);
  public profileImage$ = signal<string | null>(null);
  public iconImage$ = signal<string | null>(null);

  // Image dimensions
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

  private httpClient = inject(HttpClient);

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
      .pipe(retry(3))
      .subscribe({
        next: (data) => {
          this.createImageFromBlob(data);
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  downLoadIcon() {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + 'own-icon.ico', {
        responseType: 'blob',
      })
      .pipe(retry(3))
      .subscribe({
        next: (data) => {
          this.createIconFromBlob(data);
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  downLoadLogo() {
    return this.httpClient
      .get(`${environment.baseUrl}LoadFile/DownLoad?type=` + 'own-logo.png', {
        responseType: 'blob',
      })
      .pipe(retry(3))
      .subscribe({
        next: (data) => {
          this.createLogoFromBlob(data);
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  deleteIcon() {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + 'own-icon.ico')
      .pipe()
      .subscribe({
        next: () => {
          this.iconImage = undefined;
          this.iconImage$.set(null);
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  deleteLogo() {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + 'own-logo.png')
      .pipe()
      .subscribe({
        next: () => {
          this.logoImage = undefined;
          this.logoImage$.set(null);
          this.logoImageDimensions$.set(null);
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  deleteFile(type: string) {
    return this.httpClient
      .delete(`${environment.baseUrl}LoadFile/` + type)
      .pipe()
      .subscribe({
        next: () => {
          this.profileImage = undefined;
          this.profileImage$.set(null);
        },
        error: (error) => {
          console.log(error);
        },
      });
  }

  private createImageFromBlob(image: Blob) {
    if (image.type === 'text/plain') {
      this.profileImage = undefined;
      this.profileImage$.set(null);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        const result = reader.result as string;
        this.profileImage = result;
        this.profileImage$.set(result);
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }

  private createIconFromBlob(image: Blob) {
    if (image.type === 'text/plain') {
      this.iconImage = undefined;
      this.iconImage$.set(null);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        const result = reader.result as string;
        this.iconImage = result;
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
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }

  private createLogoFromBlob(image: Blob) {
    if (image.type === 'text/plain') {
      this.logoImage = undefined;
      this.logoImage$.set(null);
      this.logoImageDimensions$.set(null);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        const result = reader.result as string;
        this.logoImage = result;
        this.logoImage$.set(result);

        // Get image dimensions
        this.getImageDimensions(result).then((dimensions) => {
          this.logoImageDimensions$.set(dimensions);
        });
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
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

    // Calculate scale factors
    const scaleX = maxWidth / originalWidth;
    const scaleY = maxHeight / originalHeight;

    // Use the smaller scale factor to maintain proportions
    const scale = Math.min(scaleX, scaleY);

    let newWidth = Math.round(originalWidth * scale);
    let newHeight = Math.round(originalHeight * scale);

    // Ensure we don't exceed absolute maximum
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

  /**
   * Clears all cached images (used on logout)
   */
  clearAllImages(): void {
    this.profileImage = undefined;
    this.iconImage = undefined;
    this.logoImage = undefined;

    this.profileImage$.set(null);
    this.iconImage$.set(null);
    this.logoImage$.set(null);

    this.profileImageDimensions$.set(null);
    this.iconImageDimensions$.set(null);
    this.logoImageDimensions$.set(null);
  }
}
