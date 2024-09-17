import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { IconsModule } from '../icons/icons.module';
import { ButtonExcelComponent } from './button-excel/button-excel.component';
import { ButtonExcelTransparentBackgroundComponent } from './button-excel-transparent-background/button-excel-transparent-background.component';
import { ButtonNewComponent } from './button-new/button-new.component';
import { ButtonPdfComponent } from './button-pdf/button-pdf.component';
import { DragDropFileUploadDirective } from '../directives/drag-drop-file-upload.directive';
import { ButtonSettingComponent } from './button-setting/button-setting.component';
import { CounterComponent } from './counter/counter.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { CalendarDropdownComponent } from './calendar-dropdown/calendar-dropdown.component';
import { TranslateModule } from '@ngx-translate/core';
import { FallbackPipe } from '../pipes/fallback/fallback.pipe';
import { OverlayModule } from '@angular/cdk/overlay';
import { MenuComponent } from './context-menu/menu/menu.component';
import { MenuItemComponent } from './context-menu/menu-item/menu-item.component';
import { ChipsComponent } from './chips/chips.component';
import { CalendarSelectorComponent } from './calendar-selector/calendar-selector.component';

@NgModule({
  declarations: [
    ButtonExcelComponent,
    ButtonExcelTransparentBackgroundComponent,
    ButtonNewComponent,
    ButtonPdfComponent,
    DragDropFileUploadDirective,
    ButtonSettingComponent,
    CounterComponent,
    ContextMenuComponent,
    CalendarDropdownComponent,
    FallbackPipe,
    MenuComponent,
    MenuItemComponent,
    ChipsComponent,
    CalendarSelectorComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    IconsModule,
    TranslateModule,
    OverlayModule,
  ],
  exports: [
    ButtonExcelComponent,
    ButtonExcelTransparentBackgroundComponent,
    ButtonNewComponent,
    ButtonPdfComponent,
    DragDropFileUploadDirective,
    ButtonSettingComponent,
    CounterComponent,
    ContextMenuComponent,
    CalendarDropdownComponent,
    FallbackPipe,
    MenuComponent,
    MenuItemComponent,
    ChipsComponent,
    CalendarSelectorComponent,
  ],
})
export class SharedModule {}
