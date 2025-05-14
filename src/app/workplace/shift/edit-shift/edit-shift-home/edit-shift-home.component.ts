import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
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
  @Input() isCreateShift: boolean = false;
  @Output() isChangingEvent = new EventEmitter();

  isComplex = false;

  constructor(
    public dataManagementSwitchboardService: DataManagementSwitchboardService,
    public dataManagementShiftService: DataManagementShiftService,
    private router: Router,
    private localStorageService: LocalStorageService
  ) {}
  ngOnInit(): void {
    this.onIsChangingMode();

    this.dataManagementShiftService.init();

    if (this.dataManagementShiftService.editShift === undefined) {
      const tmpUrl = this.router.url;
      const res = tmpUrl.replace('?id=', ';').split(';');
      if (res.length === 2 && res[0] === '/workplace/edit-shift') {
        this.dataManagementShiftService.readShift(res[1]);
        return;
      } else {
        this.dataManagementShiftService.createShift();
      }
    }

    this.dataManagementSwitchboardService.nameOfVisibleEntity =
      'DataManagementShiftService_Edit';
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
