import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconsModule } from 'src/app/icons/icons.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from 'src/app/shared/shared.module';
import { ToastModule } from 'src/app/toast/toast.module';
import { TranslateModule } from '@ngx-translate/core';
import { EditShiftHomeComponent } from './edit-shift/edit-shift-home/edit-shift-home.component';
import { EditShiftItemComponent } from './edit-shift/edit-shift-item/edit-shift-item.component';
import { EditShiftWeekdayComponent } from './edit-shift/edit-shift-weekday/edit-shift-weekday.component';
import { EditShiftNavComponent } from './edit-shift/edit-shift-nav/edit-shift-nav.component';
import { EditShiftAddressComponent } from './edit-shift/edit-shift-address/edit-shift-address.component';
import { EditShiftSpecialFeatureComponent } from './edit-shift/edit-shift-special-feature/edit-shift-special-feature.component';
import { EditShiftMacroComponent } from './edit-shift/edit-shift-macro/edit-shift-macro.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@NgModule({
  declarations: [
    EditShiftHomeComponent,
    EditShiftItemComponent,
    EditShiftWeekdayComponent,
    EditShiftAddressComponent,
    EditShiftNavComponent,
    EditShiftSpecialFeatureComponent,
    EditShiftMacroComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    IconsModule,
    NgbModule,
    SharedModule,
    ToastModule,
    TranslateModule,
    FontAwesomeModule,
  ],
  exports: [
    EditShiftHomeComponent,
    EditShiftItemComponent,
    EditShiftWeekdayComponent,
    EditShiftAddressComponent,
    EditShiftNavComponent,
  ],
})
export class ShiftModule {}
