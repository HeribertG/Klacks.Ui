import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
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
  ],
})
export class EditShiftHomeComponent implements OnInit {
  @Input() isCreateShift = false;
  @Output() isChangingEvent = new EventEmitter();

  public dataManagementSwitchboardService = inject(
    DataManagementSwitchboardService
  );
  public dataManagementShiftService = inject(DataManagementShiftService);
  private urlParameterService = inject(UrlParameterService);
  private localStorageService = inject(LocalStorageService);

  isComplex = false;

  ngOnInit(): void {
    this.onIsChangingMode();

    this.dataManagementShiftService.init();

    if (this.dataManagementShiftService.editShift === undefined) {
      const result = this.urlParameterService.parseCurrentUrl(
        '/workplace/edit-shift'
      );
      if (result.isValidRoute && result.hasId && result.id) {
        this.dataManagementShiftService.readShift(result.id);
      } else {
        this.dataManagementShiftService.createShift();
      }
    }

    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementShiftService_Edit';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
