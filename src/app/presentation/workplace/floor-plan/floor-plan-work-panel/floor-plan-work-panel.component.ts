// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, inject, signal, computed, OnInit, OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { FloorPlanWorkDropService } from '../services/floor-plan-work-drop.service';
import { DataManagementFloorPlanService } from 'src/app/domain/services/floor-plan/data-management-floor-plan.service';
import { IFloorPlanWorkMarker, FloorPlanWorkMarker } from 'src/app/domain/models/floor-plan/floor-plan-work-marker-class';
import { FloorPlanMarkerType } from 'src/app/domain/enums/floor-plan-marker-type.enum';

@Component({
  selector: 'app-floor-plan-work-panel',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './floor-plan-work-panel.component.html',
  styleUrls: ['./floor-plan-work-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloorPlanWorkPanelComponent implements OnInit, OnDestroy {
  private workDropService = inject(FloorPlanWorkDropService);
  dataManagement = inject(DataManagementFloorPlanService);
  private destroy$ = new Subject<void>();

  readonly searchText = signal<string>('');
  readonly showAddForm = signal(false);
  readonly newLabel = signal('');
  readonly newMarkerType = signal<FloorPlanMarkerType>(FloorPlanMarkerType.Location);
  readonly newColor = signal('#0d6efd');
  readonly FloorPlanMarkerType = FloorPlanMarkerType;

  readonly workMarkers = computed(() => {
    const plan = this.dataManagement.selectedFloorPlan();
    return plan?.workMarkers ?? [];
  });

  readonly filteredMarkers = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const markers = this.workMarkers();
    if (!search) return markers;
    return markers.filter(
      (m) =>
        m.clientName?.toLowerCase().includes(search) ||
        m.shiftName?.toLowerCase().includes(search) ||
        m.label?.toLowerCase().includes(search)
    );
  });

  ngOnInit(): void {
    this.dataManagement.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string): void {
    this.searchText.set(value);
  }

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
    this.newLabel.set('');
    this.newMarkerType.set(FloorPlanMarkerType.Location);
    this.newColor.set('#0d6efd');
  }

  async onAddMarker(): Promise<void> {
    const plan = this.dataManagement.selectedFloorPlan();
    if (!plan?.id || !this.newLabel().trim()) return;

    const marker = new FloorPlanWorkMarker();
    marker.floorPlanId = plan.id;
    marker.label = this.newLabel().trim();
    marker.markerType = this.newMarkerType();
    marker.color = this.newColor();
    marker.x = 0;
    marker.y = 0;
    marker.width = 120;
    marker.height = 50;

    await this.dataManagement.addMarker(marker);
    this.toggleAddForm();
  }

  onDragStart(marker: IFloorPlanWorkMarker, event: DragEvent): void {
    this.workDropService.startDrag({
      id: marker.id,
      clientId: marker.clientId,
      clientName: marker.clientName,
      label: marker.label,
      shiftName: marker.shiftName,
      startTime: marker.startTime,
      endTime: marker.endTime,
    });

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', marker.id ?? '');
    }
  }

  onDragEnd(): void {
    if (this.workDropService.isDragging()) {
      this.workDropService.cancelDrag();
    }
  }

  formatTime(start?: string, end?: string): string {
    if (!start && !end) return '';
    if (start && end) return `${start} - ${end}`;
    return start ?? end ?? '';
  }
}
