/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/domain/services/shift/data-management-shift.service';
import { WorkplaceStateService } from 'src/app/presentation/workplace/core/workplace-state.service';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { EditShiftItemComponent } from '../edit-shift-item/edit-shift-item.component';
import { EditShiftWeekdayComponent } from '../edit-shift-weekday/edit-shift-weekday.component';
import { EditShiftMacroComponent } from '../edit-shift-macro/edit-shift-macro.component';
import { EditShiftAddressComponent } from '../edit-shift-address/edit-shift-address.component';
import { EditShiftSpecialFeatureComponent } from '../edit-shift-special-feature/edit-shift-special-feature.component';
import { EditShiftNavComponent } from '../edit-shift-nav/edit-shift-nav.component';
import { UrlParameterService } from 'src/app/presentation/services/url-parameter.service';
import { FooterService } from 'src/app/presentation/services/footer.service';
import { EditShiftGroupComponent } from '../edit-shift-group/edit-shift-group.component';
import { NavigationService } from 'src/app/presentation/services/navigation.service';
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
export class EditShiftHomeComponent implements OnInit {

  private workplaceStateService = inject(
    WorkplaceStateService
  );
  public dataManagementShiftService = inject(DataManagementShiftService);
  public authorizationService = inject(AuthorizationService);
  private urlParameterService = inject(UrlParameterService);
  private localStorageService = inject(LocalStorageService);
  private navigationService = inject(NavigationService);
  private footerService = inject(FooterService);
  private layoutService = inject(LayoutService);
  private searchService = inject(SearchService);

  isComplex = false;

  // Getter to determine if nav should be hidden when shift status is IsCut
  get isNavVisible(): boolean {
    return (
      this.dataManagementShiftService.editShift?.status !== ShiftStatus.IsCut
    );
  }

  ngOnInit(): void {
    this.layoutService.setContainerToNormalSize();
    
    // Hide search for edit/new pages
    this.searchService.setSearchVisibility(false);
    
    // Determine the route and set active manager
    const result1 = this.urlParameterService.parseCurrentUrl(
      '/workplace/edit-shift'
    );
    const result2 = this.urlParameterService.parseCurrentUrl(
      '/workplace/new-shift'
    );

    if (result1.isValidRoute) {
      this.workplaceStateService.setActiveManagerByRoute(
        'edit-shift'
      );
    } else if (result2.isValidRoute) {
      this.workplaceStateService.setActiveManagerByRoute(
        'new-shift'
      );
    }
    
    // Show footer for this edit/new page
    this.footerService.setFooterVisibility(true);

    if (this.dataManagementShiftService.editShift === undefined) {
      if (result1.isValidRoute && result1.hasId && result1.id) {
        this.dataManagementShiftService.readShift(result1.id);
      } else {
        if (this.authorizationService.isAdmin) {
          this.dataManagementShiftService.createShift();
        } else {
          this.navigationService.navigateToPageNotFound();
        }
      }

      if (result2.isValidRoute) {
        this.dataManagementShiftService.createShift();
      }
    }

    this.onIsChangingMode();
    this.dataManagementShiftService.init();
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
