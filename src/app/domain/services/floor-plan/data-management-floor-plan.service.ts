// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FloorPlan, IFloorPlan } from 'src/app/domain/models/floor-plan/floor-plan-class';
import { FloorPlanWorkMarker } from 'src/app/domain/models/floor-plan/floor-plan-work-marker-class';
import { DataFloorPlanService } from 'src/app/infrastructure/api/floor-plan/data-floor-plan.service';

@Injectable({
  providedIn: 'root',
})
export class DataManagementFloorPlanService {
  private dataFloorPlanService = inject(DataFloorPlanService);

  floorPlans = signal<IFloorPlan[]>([]);
  selectedFloorPlan = signal<IFloorPlan | null>(null);
  isLoading = signal(false);

  loadAll(): void {
    this.isLoading.set(true);
    this.dataFloorPlanService.list().subscribe({
      next: (items) => {
        this.floorPlans.set(items);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  loadById(id: string): void {
    this.isLoading.set(true);
    this.dataFloorPlanService.get(id).subscribe({
      next: (item) => {
        this.selectedFloorPlan.set(item);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  async loadByIdAsync(id: string): Promise<IFloorPlan | null> {
    this.isLoading.set(true);
    try {
      const item = await firstValueFrom(this.dataFloorPlanService.get(id));
      this.selectedFloorPlan.set(item);
      return item;
    } catch {
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async save(floorPlan: FloorPlan): Promise<void> {
    this.isLoading.set(true);
    try {
      if (floorPlan.id) {
        const updated = await firstValueFrom(this.dataFloorPlanService.update(floorPlan));
        this.selectedFloorPlan.set(updated);
        this.floorPlans.update((list) =>
          list.map((item) => (item.id === updated.id ? updated : item))
        );
      } else {
        const created = await firstValueFrom(this.dataFloorPlanService.create(floorPlan));
        this.selectedFloorPlan.set(created);
        this.floorPlans.update((list) => [...list, created]);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async delete(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.dataFloorPlanService.delete(id));
      this.floorPlans.update((list) => list.filter((item) => item.id !== id));
      if (this.selectedFloorPlan()?.id === id) {
        this.selectedFloorPlan.set(null);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async addMarker(marker: FloorPlanWorkMarker): Promise<void> {
    const created = await firstValueFrom(this.dataFloorPlanService.addMarker(marker));
    this.selectedFloorPlan.update((plan) => {
      if (!plan) return plan;
      return { ...plan, workMarkers: [...plan.workMarkers, created] };
    });
  }

  async updateMarker(marker: FloorPlanWorkMarker): Promise<void> {
    const updated = await firstValueFrom(this.dataFloorPlanService.updateMarker(marker));
    this.selectedFloorPlan.update((plan) => {
      if (!plan) return plan;
      return {
        ...plan,
        workMarkers: plan.workMarkers.map((m) => (m.id === updated.id ? updated : m)),
      };
    });
  }

  async deleteMarker(id: string): Promise<void> {
    await firstValueFrom(this.dataFloorPlanService.deleteMarker(id));
    this.selectedFloorPlan.update((plan) => {
      if (!plan) return plan;
      return {
        ...plan,
        workMarkers: plan.workMarkers.filter((m) => m.id !== id),
      };
    });
  }
}
