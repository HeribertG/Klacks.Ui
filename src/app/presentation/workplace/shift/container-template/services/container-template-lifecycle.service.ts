// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Facade-Service für Initialisierung, Lifecycle und Suchzustand der Container-Template-Komponente.
 * @param layoutService - Setzt die Container-Größe bei Initialisierung
 * @param savebarService - Steuert die Sichtbarkeit der Speicherleiste
 * @param searchService - Steuert die Sichtbarkeit der Suchleiste
 * @param searchStateService - Liefert den aktuellen Suchstring und Adress-Flag
 * @param workplaceStateService - Setzt aktiven Manager und Entity-Name, prüft Dirty-State
 * @param appSettingsService - Lädt App-Einstellungen beim Init
 * @param branchService - Lädt Filialen beim Init
 * @param activatedRoute - Liefert Route-Parameter (Container-Shift-ID)
 * @param dataShiftService - Lädt Schicht-Daten per API
 */
import { Injectable, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject, map } from 'rxjs';
import { takeUntil } from 'rxjs';
import { SearchService } from 'src/app/application/services/search.service';
import { SearchStateService } from 'src/app/application/services/search-state.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { EntityName, RouteName } from 'src/app/domain/enums/entity-names.enum';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { AppSettingsManagementService } from 'src/app/domain/services/settings/app-settings-management.service';
import { BranchManagementService } from 'src/app/domain/services/settings/branch-management.service';
import { DataShiftService } from 'src/app/infrastructure/api/shift/data-shift.service';
import { IShift } from 'src/app/domain/models/shift/shift-class';

@Injectable()
export class ContainerTemplateLifecycleService {
  private layoutService = inject(LayoutService);
  private savebarService = inject(SavebarService);
  private searchService = inject(SearchService);
  readonly searchStateService = inject(SearchStateService);
  readonly workplaceStateService = inject(WorkplaceStateService);
  private appSettingsService = inject(AppSettingsManagementService);
  private branchService = inject(BranchManagementService);
  private activatedRoute = inject(ActivatedRoute);
  private dataShiftService = inject(DataShiftService);

  initialize(): void {
    this.layoutService.setContainerToNormalSize();
    this.workplaceStateService.setActiveManagerByRoute(
      RouteName.CONTAINER_TEMPLATE,
    );
    this.workplaceStateService.setNameOfVisibleEntity(
      EntityName.SHIFT_CONTAINER_TEMPLATE,
    );
    this.searchService.setSearchVisibility(true);
    this.savebarService.setSavebarVisibility(true);
    this.appSettingsService.loadSettings();
    this.branchService.loadBranches();
  }

  observeRouteParams(destroy$: Subject<void>): Observable<string> {
    return this.activatedRoute.params.pipe(
      takeUntil(destroy$),
      map((params) => params['id'] as string),
    );
  }

  loadShift(id: string): Observable<IShift> {
    return this.dataShiftService.getShift(id);
  }

  markDirty(): void {
    this.workplaceStateService.areObjectsDirty();
  }
}
