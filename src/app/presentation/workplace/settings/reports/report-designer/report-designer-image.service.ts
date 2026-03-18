// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for handling image uploads, previews, and file-to-DataURL conversion in the report designer.
 * @param http - HttpClient for uploading and downloading image files
 * @param imagePreviewCache - Shared cache map for image preview DataURLs
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import {
  ReportField,
  ReportFieldType,
  DEFAULT_FIELD_STYLE,
  TextAlignment,
} from 'src/app/domain/models/report/report-field.model';

export interface ImageUploadResult {
  field: ReportField;
  success: boolean;
}

@Injectable()
export class ReportDesignerImageService {
  private http = inject(HttpClient);

  async onImageChipUpload(
    event: Event,
    field: ReportField,
    imagePreviewCache: Map<string, string>,
  ): Promise<boolean> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return false;

    const file = input.files[0];
    const imageId = crypto.randomUUID();
    const fileName = `report-img-${imageId}.png`;

    const localDataUrl = await this.fileToDataUrl(file);
    imagePreviewCache.set(fileName, localDataUrl);

    const formData = new FormData();
    formData.append('file', file, fileName);

    try {
      await firstValueFrom(this.http.post(`${environment.baseUrl}LoadFile/Upload/`, formData));
      field.imageUrl = fileName;
      field.name = fileName;
      input.value = '';
      return true;
    } catch (err) {
      console.error('Image upload failed:', err);
      imagePreviewCache.delete(fileName);
      input.value = '';
      return false;
    }
  }

  async onImageUpload(
    event: Event,
    section: ReportSection,
    rowIndex: number,
    alignment: TextAlignment,
    imagePreviewCache: Map<string, string>,
  ): Promise<ReportField | null> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return null;

    const file = input.files[0];
    const imageId = crypto.randomUUID();
    const fileName = `report-img-${imageId}.png`;

    const localDataUrl = await this.fileToDataUrl(file);
    imagePreviewCache.set(fileName, localDataUrl);

    const formData = new FormData();
    formData.append('file', file, fileName);

    try {
      await firstValueFrom(this.http.post(`${environment.baseUrl}LoadFile/Upload/`, formData));

      const field: ReportField = {
        name: fileName,
        dataBinding: 'report.image',
        type: ReportFieldType.Image,
        width: 30,
        height: 15,
        style: { ...DEFAULT_FIELD_STYLE, alignment },
        sortOrder: rowIndex,
        imageUrl: fileName,
      };

      section.fields = [...section.fields, field];
      input.value = '';
      return field;
    } catch (err) {
      console.error('Image upload failed:', err);
      imagePreviewCache.delete(fileName);
      input.value = '';
      return null;
    }
  }

  loadImagePreview(fileName: string, imagePreviewCache: Map<string, string>): void {
    if (imagePreviewCache.has(fileName)) return;

    this.http.get(`${environment.baseUrl}LoadFile/DownLoad?type=${fileName}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          if (blob.type === 'text/plain') return;
          const reader = new FileReader();
          reader.onload = () => {
            imagePreviewCache.set(fileName, reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      });
  }

  loadExistingImages(section: ReportSection, imagePreviewCache: Map<string, string>): void {
    for (const field of section.fields) {
      if (field.type === ReportFieldType.Image && field.imageUrl) {
        this.loadImagePreview(field.imageUrl, imagePreviewCache);
      }
    }
  }

  fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
