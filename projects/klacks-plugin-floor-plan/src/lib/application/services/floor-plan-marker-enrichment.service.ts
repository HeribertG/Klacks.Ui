// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Lazy-loads phone and image data for floor-plan work markers.
 * @param clientService - Backend service used to fetch the full client record once per client id
 */

import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';

export interface IFloorPlanMarkerEnrichment {
  phone: string | null;
  imageDataUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class FloorPlanMarkerEnrichmentService {
  private clientService = inject(DataClientService);
  private cache = new Map<string, IFloorPlanMarkerEnrichment>();
  private inflight = new Map<string, Promise<IFloorPlanMarkerEnrichment>>();

  get(clientId: string): IFloorPlanMarkerEnrichment | null {
    return this.cache.get(clientId) ?? null;
  }

  async load(clientId: string): Promise<IFloorPlanMarkerEnrichment> {
    const cached = this.cache.get(clientId);
    if (cached) return cached;

    const pending = this.inflight.get(clientId);
    if (pending) return pending;

    const promise = this.fetchAndCache(clientId);
    this.inflight.set(clientId, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(clientId);
    }
  }

  async loadMany(clientIds: readonly string[]): Promise<Map<string, IFloorPlanMarkerEnrichment>> {
    const missing = clientIds.filter((id) => !this.cache.has(id));
    await Promise.all(missing.map((id) => this.load(id)));
    return new Map(clientIds.map((id) => [id, this.cache.get(id)!]));
  }

  clear(): void {
    this.cache.clear();
  }

  private async fetchAndCache(clientId: string): Promise<IFloorPlanMarkerEnrichment> {
    try {
      const client = await firstValueFrom(this.clientService.getClient(clientId));
      const enrichment: IFloorPlanMarkerEnrichment = {
        phone: this.extractPhone(client?.communications),
        imageDataUrl: this.buildImageDataUrl(client?.clientImage),
      };
      this.cache.set(clientId, enrichment);
      return enrichment;
    } catch {
      const empty: IFloorPlanMarkerEnrichment = { phone: null, imageDataUrl: null };
      this.cache.set(clientId, empty);
      return empty;
    }
  }

  private extractPhone(communications: { isPhone: boolean; value: string }[] | undefined): string | null {
    if (!communications) return null;
    const phone = communications.find((c) => c.isPhone && !!c.value);
    return phone ? phone.value : null;
  }

  private buildImageDataUrl(image: { imageData: string; contentType: string } | undefined): string | null {
    if (!image || !image.imageData) return null;
    return `data:${image.contentType};base64,${image.imageData}`;
  }
}
