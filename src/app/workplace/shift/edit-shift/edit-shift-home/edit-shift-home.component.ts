/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataManagementShiftService } from 'src/app/data/management/data-management-shift.service';
import { DataManagementSwitchboardService } from 'src/app/data/management/data-management-switchboard.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EditShiftItemComponent } from '../edit-shift-item/edit-shift-item.component';
import { EditShiftWeekdayComponent } from '../edit-shift-weekday/edit-shift-weekday.component';
import { EditShiftMacroComponent } from '../edit-shift-macro/edit-shift-macro.component';
import { EditShiftAddressComponent } from '../edit-shift-address/edit-shift-address.component';
import { EditShiftSpecialFeatureComponent } from '../edit-shift-special-feature/edit-shift-special-feature.component';
import { EditShiftNavComponent } from '../edit-shift-nav/edit-shift-nav.component';
import { UrlParameterService } from 'src/app/services/url-parameter.service';
import { EditShiftGroupComponent } from '../edit-shift-group/edit-shift-group.component';
import { NavigationService } from 'src/app/services/navigation.service';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { ShiftStatus } from 'src/app/core/shift-class';
import { faEarListen } from '@fortawesome/free-solid-svg-icons';

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
  @Input() isCreateShift = false;
  @Output() isChangingEvent = new EventEmitter();

  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  public dataManagementShiftService = inject(DataManagementShiftService);
  public authorizationService = inject(AuthorizationService);
  private urlParameterService = inject(UrlParameterService);
  private localStorageService = inject(LocalStorageService);
  private navigationService = inject(NavigationService);

  isComplex = false;

  // Getter to determine if nav should be hidden when shift status is IsCut
  get isNavVisible(): boolean {
    return (
      this.dataManagementShiftService.editShift?.status !== ShiftStatus.IsCut
    );
  }

  ngOnInit(): void {
    // Determine the route and set active manager
    const result1 = this.urlParameterService.parseCurrentUrl('/workplace/edit-shift');
    const result2 = this.urlParameterService.parseCurrentUrl('/workplace/new-shift');
    
    if (result1.isValidRoute) {
      this.dataManagementSwitchboardService.setActiveManagerByRoute('edit-shift');
    } else if (result2.isValidRoute) {
      this.dataManagementSwitchboardService.setActiveManagerByRoute('new-shift');
    }

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
    this.isChangingEvent.emit(event);
  }

  onIsChangingMode(): void {
    const currentMode = this.localStorageService.get('mode')
      ? this.localStorageService.get('mode')
      : null;

    this.isComplex = currentMode === 'complex' ? true : false;
  }
}
