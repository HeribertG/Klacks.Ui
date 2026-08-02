// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Loads report font files from the asset folder and converts them to the base64 form jsPDF expects.
 * @param fileName - TTF file name inside the report font asset folder
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { REPORT_FONT_ASSET_PATH } from 'src/app/domain/models/report/report-font.model';

const BASE64_CHUNK_SIZE = 0x2000;

@Injectable({ providedIn: 'root' })
export class DataReportFontService {
  private http = inject(HttpClient);

  async loadFontAsBase64(fileName: string): Promise<string> {
    const buffer = await firstValueFrom(
      this.http.get(`${REPORT_FONT_ASSET_PATH}${fileName}`, { responseType: 'arraybuffer' })
    );
    return this.toBase64(new Uint8Array(buffer));
  }

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
      const chunk = bytes.subarray(offset, offset + BASE64_CHUNK_SIZE);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
}
