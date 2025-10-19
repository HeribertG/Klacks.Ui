/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
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
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ShiftStatus } from 'src/app/domain/models/shift-class';
import { LayoutService } from 'src/app/presentation/services/layout.service';
import { SearchService } from 'src/app/application/services/search.service';

@Component({
  selector: 'app-edit-shift-home',
  templateUrl: './edit-shift-home.component.html',
  styleUrls: ['./edit-shift-home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    EditShiftItemComponent,
    EditShiftWeekdayComponent,
    EditShiftMacroComponent,
    EditShiftAddressComponent,
    EditShiftSpecialFeatureComponent,
    EditShiftNavComponent,
    EditShiftGroupComponent,
  ],
})
export class EditShiftHomeComponent implements OnInit, OnDestroy {

  private workplaceStateService = inject(WorkplaceStateService);
  public dataManagementShiftService = inject(DataManagementShiftService);
  public authorizationService = inject(AuthorizationService);
  private activatedRoute = inject(ActivatedRoute);
  private localStorageService = inject(LocalStorageService);
  private savebarService = inject(SavebarService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);
  private destroy$ = new Subject<void>();

  isComplex = false;

  // Getter to determine if nav should be hidden when shift status is IsCut
  get isNavVisible(): boolean {
    return (
      this.dataManagementShiftService.editShift?.status !== ShiftStatus.IsCut
    );
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    this.searchService.setSearchVisibility(false);
    this.savebarService.setSavebarVisibility(true);

    this.activatedRoute.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];

      if (id) {
        this.workplaceStateService.setActiveManagerByRoute('edit-shift');
        this.dataManagementShiftService.readShift(id);
      } else {
        this.workplaceStateService.setActiveManagerByRoute('new-shift');
        this.dataManagementShiftService.createShift();
      }
    });

    this.onIsChangingMode();
    this.dataManagementShiftService.init();
  }

  ngOnDestroy(): void {
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
