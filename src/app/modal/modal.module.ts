import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './modal/modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DeletewindowComponent } from './deletewindow/deletewindow.component';
import { MessageWindowComponent } from './message-window/message-window.component';
import { FormsModule } from '@angular/forms';
import { IconAngleRightComponent } from '../icons/icon-angle-right.component';
import { IconAngleDownComponent } from '../icons/icon-angle-down.component';
import { TrashIconRedComponent } from '../icons/trash-icon-red.component';
import { IconCopyGreyComponent } from '../icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from '../icons/pencil-icon-grey.component';
import { ExcelComponent } from '../icons/excel.component';
import { CalendarIconComponent } from '../icons/calendar-icon.component';
import { ChooseCalendarComponent } from '../icons/choose-calendar.component';
import { TrashIconLightRedComponent } from '../icons/trash-icon-light-red.component ';
import { GearGreyComponent } from '../icons/gear-grey.component';
import { IconDescComponent } from '../icons/icon-desc.component';
import { IconAscComponent } from '../icons/icon-asc.component';
import { PdfIconComponent } from '../icons/pdf-icon.component';
import { IconUserComponent } from '../icons/icon-user.component';
import { IconSignOutComponent } from '../icons/icon-sign-out.component';
import { IconSettingComponent } from '../icons/icon-setting.component';
import { AttentionGreyComponent } from '../icons/attention-icon-grey.component';
import { QuestionMarkRoundComponent } from '../icons/icon-round-question_mark.component';

@NgModule({
  declarations: [],
  imports: [
    ModalComponent,
    DeletewindowComponent,
    MessageWindowComponent,
    CommonModule,
    TranslateModule,
    NgbModule,
    FormsModule,
    IconAngleRightComponent,
    IconAngleDownComponent,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    CalendarIconComponent,
    ChooseCalendarComponent,
    TrashIconLightRedComponent,
    GearGreyComponent,
    IconDescComponent,
    IconAscComponent,
    PdfIconComponent,
    IconUserComponent,
    IconSignOutComponent,
    IconAngleRightComponent,
    IconAngleDownComponent,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    CalendarIconComponent,
    ChooseCalendarComponent,
    TrashIconLightRedComponent,
    GearGreyComponent,
    IconDescComponent,
    IconAscComponent,
    PdfIconComponent,
    IconUserComponent,
    IconSignOutComponent,
    IconSettingComponent,
    IconSettingComponent,
    QuestionMarkRoundComponent,
    AttentionGreyComponent,
  ],
  exports: [ModalComponent, DeletewindowComponent, MessageWindowComponent],
})
export class ModalModule {}
