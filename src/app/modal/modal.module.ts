import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalComponent } from './modal/modal.component';
import { TranslateModule } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DeletewindowComponent } from './deletewindow/deletewindow.component';
import { MessageWindowComponent } from './message-window/message-window.component';
import { IconsModule } from '../icons/icons.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [ModalComponent, DeletewindowComponent, MessageWindowComponent],
  imports: [CommonModule, TranslateModule, NgbModule, IconsModule, FormsModule],
  exports: [ModalComponent],
})
export class ModalModule {}
