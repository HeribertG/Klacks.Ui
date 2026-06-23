// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Main dashboard component with collapsible, hideable and reorderable sections.
 * @param sectionsState - Signal tracking expand/collapse state per section key
 * @param sectionVisibilityModel - Signal form model for per-section visibility, persisted in localStorage
 * @param sectionOrder - Signal tracking display order of sections, persisted in localStorage
 */
import { Component, inject, OnInit, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { StorageKeys } from 'src/app/domain/constants/storage-keys';
import { DashboardClientsOverviewComponent } from '../dashboard-clients-overview/dashboard-clients-overview.component';
import { DashboardClientsLocationsComponent } from '../dashboard-clients-locations/dashboard-clients-locations.component';
import { DashboardShiftsOverviewComponent } from '../dashboard-shifts-overview/dashboard-shifts-overview.component';
import { DashboardShiftCoverageComponent } from '../dashboard-shift-coverage/dashboard-shift-coverage.component';
import { DashboardResourceMonitorComponent } from '../dashboard-resource-monitor/dashboard-resource-monitor.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconCollapseAllGreyComponent } from 'src/app/presentation/icons/icon-collapse-all-grey.component';
import { IconExpandAllGreyComponent } from 'src/app/presentation/icons/icon-expand-all-grey.component';
import { ClickOutsideDirective } from 'src/app/presentation/directives/click-outside.directive';
import { IconSettingsThreeComponent } from 'src/app/presentation/icons/icon-settings-three.component';
import { IconGripVerticalComponent } from 'src/app/presentation/icons/icon-grip-vertical.component';

const DEFAULT_SECTION_ORDER = ['overview', 'coverage', 'resources', 'locations'] as const;

interface SectionVisibilityFormModel {
  overview: boolean;
  coverage: boolean;
  resources: boolean;
  locations: boolean;
}

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.component.html',
  styleUrls: ['./dashboard-home.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    FormField,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    DashboardClientsOverviewComponent,
    DashboardClientsLocationsComponent,
    DashboardShiftsOverviewComponent,
    DashboardShiftCoverageComponent,
    DashboardResourceMonitorComponent,
    IconAngleDownComponent,
    IconAngleRightComponent,
    IconCollapseAllGreyComponent,
    IconExpandAllGreyComponent,
    ClickOutsideDirective,
    IconSettingsThreeComponent,
    IconGripVerticalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHomeComponent implements OnInit {
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private workplaceStateService = inject(WorkplaceStateService);
  private authorizationService = inject(AuthorizationService);
  private localStorageService = inject(LocalStorageService);

  readonly sectionKeys = DEFAULT_SECTION_ORDER;

  menuOpen = signal(false);

  sectionsState = signal<Record<string, boolean>>({
    overview: true,
    coverage: true,
    resources: true,
    locations: true,
  });

  sectionVisibilityModel = signal<SectionVisibilityFormModel>({
    overview: true,
    coverage: true,
    resources: true,
    locations: true,
  });
  sectionVisibilityForm = form(this.sectionVisibilityModel);

  sectionOrder = signal<string[]>([...DEFAULT_SECTION_ORDER]);

  private visibilityFormInitialized = false;

  constructor() {
    effect(() => {
      const vis = this.sectionVisibilityModel();
      if (!this.visibilityFormInitialized) return;
      this.localStorageService.setJson(StorageKeys.DASHBOARD_SECTION_VISIBILITY, vis);
    });
  }

  readonly visibleSectionOrder = computed(() =>
    this.sectionOrder().filter(
      k =>
        this.sectionVisibilityModel()[k as keyof SectionVisibilityFormModel] &&
        (this.authorizationService.isAuthorised || k === 'locations')
    )
  );

  ngOnInit(): void {
    this.savebarService.setSavebarVisibility(false);
    this.searchService.setSearchVisibility(false);
    this.workplaceStateService.setActiveManagerByRoute(RouteName.DASHBOARD);
    this.workplaceStateService.isFocusChanged.set(true);
    this.layoutService.setContainerToNormalSize();
    this.loadSectionVisibility();
    this.loadSectionOrder();
    this.visibilityFormInitialized = true;
  }

  toggleSection(section: string): void {
    this.sectionsState.update(s => ({ ...s, [section]: !s[section] }));
  }

  expandAll(): void {
    this.sectionsState.update(s =>
      Object.fromEntries(Object.keys(s).map(k => [k, true]))
    );
  }

  collapseAll(): void {
    this.sectionsState.update(s =>
      Object.fromEntries(Object.keys(s).map(k => [k, false]))
    );
  }

  toggleMenuOpen(): void {
    this.menuOpen.update(v => !v);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  toggleSectionVisibility(key: string): void {
    const k = key as keyof SectionVisibilityFormModel;
    this.sectionVisibilityModel.update(m => ({ ...m, [k]: !m[k] }));
  }

  onSectionDrop(event: CdkDragDrop<string[]>): void {
    const vis = this.sectionVisibilityModel();
    const currentOrder = this.sectionOrder();
    const visibleKeys = currentOrder.filter(k => vis[k as keyof SectionVisibilityFormModel]);
    moveItemInArray(visibleKeys, event.previousIndex, event.currentIndex);
    let visibleIdx = 0;
    const newOrder = currentOrder.map(k =>
      vis[k as keyof SectionVisibilityFormModel] ? visibleKeys[visibleIdx++] : k
    );
    this.sectionOrder.set(newOrder);
    this.saveSectionOrder();
  }

  private loadSectionVisibility(): void {
    try {
      const stored = this.localStorageService.getJson(
        StorageKeys.DASHBOARD_SECTION_VISIBILITY
      ) as Partial<SectionVisibilityFormModel> | null;
      if (!stored) return;
      this.sectionVisibilityModel.update(m => {
        const updated = { ...m };
        (this.sectionKeys as readonly string[]).forEach(key => {
          const k = key as keyof SectionVisibilityFormModel;
          if (k in stored && typeof stored[k] === 'boolean') {
            updated[k] = stored[k]!;
          }
        });
        return updated;
      });
    } catch {
      // Silently fall back to defaults on corrupt storage
    }
  }

  private loadSectionOrder(): void {
    try {
      const stored = this.localStorageService.getJson(
        StorageKeys.DASHBOARD_SECTION_ORDER
      ) as string[] | null;
      if (!Array.isArray(stored)) return;
      const valid = stored.filter(k =>
        (DEFAULT_SECTION_ORDER as readonly string[]).includes(k)
      );
      const missing = (DEFAULT_SECTION_ORDER as readonly string[]).filter(
        k => !valid.includes(k)
      );
      this.sectionOrder.set([...valid, ...missing]);
    } catch {
      // Silently fall back to default order on corrupt storage
    }
  }

  private saveSectionOrder(): void {
    this.localStorageService.setJson(
      StorageKeys.DASHBOARD_SECTION_ORDER,
      this.sectionOrder()
    );
  }
}
