// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { WorkplaceStateService } from 'src/app/application/services/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { EditShiftItemComponent } from '../edit-shift-item/edit-shift-item.component';
import { EditShiftWeekdayComponent } from '../edit-shift-weekday/edit-shift-weekday.component';
import { EditShiftMacroComponent } from '../edit-shift-macro/edit-shift-macro.component';
import { EditShiftAddressComponent } from '../edit-shift-address/edit-shift-address.component';
import { EditShiftSpecialFeatureComponent } from '../edit-shift-special-feature/edit-shift-special-feature.component';
import { EditShiftNavComponent } from '../edit-shift-nav/edit-shift-nav.component';
import { SavebarService } from 'src/app/presentation/services/savebar.service';
import { EditShiftGroupComponent } from '../edit-shift-group/edit-shift-group.component';
import { EditShiftExpensesComponent } from '../edit-shift-expenses/edit-shift-expenses.component';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ShiftStatus, ShiftType } from 'src/app/domain/models/shift/shift-class';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';
import { ShiftFormService } from '../services/shift-form.service';

@Component({
  selector: 'app-edit-shift-home',
  templateUrl: './edit-shift-home.component.html',
  styleUrls: ['./edit-shift-home.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslateModule,
    EditShiftItemComponent,
    EditShiftWeekdayComponent,
    EditShiftMacroComponent,
    EditShiftAddressComponent,
    EditShiftSpecialFeatureComponent,
    EditShiftNavComponent,
    EditShiftGroupComponent,
    EditShiftExpensesComponent,
],
})
export class EditShiftHomeComponent implements OnInit, OnDestroy {

  private workplaceStateService = inject(WorkplaceStateService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  public dataManagementGroupService = inject(DataManagementGroupService);
  public authorizationService = inject(AuthorizationService);
  private activatedRoute = inject(ActivatedRoute);
  private localStorageService = inject(LocalStorageService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private shiftFormService = inject(ShiftFormService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  isComplex = false;
  isReadOnly = false;
  private returnUrl: string | null = null;

  constructor() {
    effect(() => {
      this.dataManagementShiftService.isReset();
      this.dataManagementShiftService.isRead();
      this.cdr.markForCheck();
    });
  }

  // Getter to determine if nav should be hidden when shift status is IsCut
  get isNavVisible(): boolean {
    return (
      this.dataManagementShiftService.editShift?.status !== ShiftStatus.SplitShift &&
      !this.isContainer
    );
  }

  get isContainer(): boolean {
    return (
      this.dataManagementShiftService.editShift?.shiftType === ShiftType.IsContainer
    );
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.savebarService.setSavebarVisibility(true);

    this.dataManagementShiftService.onBeforeSave = () => {
      this.shiftFormService.applyFormToShift();
    };

    combineLatest([
      this.activatedRoute.params,
      this.activatedRoute.queryParams
    ]).pipe(takeUntil(this.destroy$)).subscribe(([params, queryParams]) => {
      this.isReadOnly = queryParams['readonly'] === 'true';
      this.returnUrl = queryParams['returnUrl'] || null;

      if (this.returnUrl) {
        this.dataManagementShiftService.returnUrl = this.returnUrl;
      }

      const id = params['id'];
      if (id) {
        this.workplaceStateService.setActiveManagerByRoute('edit-shift');
        this.dataManagementShiftService.readShift(id);
      } else {
        this.workplaceStateService.setActiveManagerByRoute('new-shift');
        this.dataManagementShiftService.createShift();
      }
      this.cdr.markForCheck();
    });

    this.onIsChangingMode();
    this.dataManagementShiftService.init();
    this.dataManagementGroupService.init();
  }

  ngOnDestroy(): void {
    this.dataManagementShiftService.returnUrl = null;
    this.destroy$.next();
    this.destroy$.complete();
  }

  onIsChanging(event: any) {
    
    // Forward to WorkplaceStateService to update footer buttons
    if (event === true) {
      this.workplaceStateService.areObjectsDirty();
    } else {
      this.workplaceStateService.checkIfDirtyIsNecessary();
    }
  }

  onIsChangingMode(): void {
    const currentMode = this.localStorageService.get('mode')
      ? this.localStorageService.get('mode')
      : null;

    this.isComplex = currentMode === 'complex' ? true : false;
  }
}
