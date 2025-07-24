/* eslint-disable @typescript-eslint/no-explicit-any */
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { retry } from 'rxjs/operators';

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
      return;
    }
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      () => {
        const result = reader.result as string;
        this.logoImage = result;
        this.logoImage$.set(result);
      },
      false
    );

    if (image) {
      reader.readAsDataURL(image);
    }
  }
}
