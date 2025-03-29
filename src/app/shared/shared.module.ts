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
import { CalendarDropdownComponent } from './calendar-dropdown/calendar-dropdown.component';
import { TranslateModule } from '@ngx-translate/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { ChipsComponent } from './chips/chips.component';
import { CalendarSelectorComponent } from './calendar-selector/calendar-selector.component';
import { FallbackPipe } from '../pipes/fallback/fallback.pipe';
import { ResizeDirective } from '../directives/resize.directive';
import { HScrollbarComponent } from './h-scrollbar/h-scrollbar.component';
import { VScrollbarComponent } from './v-scrollbar/v-scrollbar.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { ScrollbarService } from './scrollbar/scrollbar.service';
import { CounterComponent } from './counter/counter.component';
import { ClickOutsideDirective } from '../directives/click-outside.directive';
import { MenuItemComponent } from './context-menu/menu-item/menu-item.component';
import { MenuComponent } from './context-menu/menu/menu.component';
import { ContextMenuComponent } from './context-menu/context-menu.component';

@NgModule({
  declarations: [
    ButtonExcelComponent,
    ButtonExcelTransparentBackgroundComponent,
    ButtonNewComponent,
    ButtonPdfComponent,
    DragDropFileUploadDirective,
    ButtonSettingComponent,
    CalendarDropdownComponent,
    FallbackPipe,
    ChipsComponent,
    CalendarSelectorComponent,
    ResizeDirective,
    HScrollbarComponent,
    VScrollbarComponent,
    CounterComponent,
    ContextMenuComponent,
    MenuComponent,
    MenuItemComponent,
    ClickOutsideDirective,
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModule,
    IconsModule,
    TranslateModule,
    OverlayModule,
    FontAwesomeModule,
  ],
  exports: [
    ButtonExcelComponent,
    ButtonExcelTransparentBackgroundComponent,
    ButtonNewComponent,
    ButtonPdfComponent,
    DragDropFileUploadDirective,
    ButtonSettingComponent,
    CalendarDropdownComponent,
    FallbackPipe,
    ChipsComponent,
    CalendarSelectorComponent,
    ResizeDirective,
    HScrollbarComponent,
    VScrollbarComponent,
    CounterComponent,
    ContextMenuComponent,
    MenuComponent,
    MenuItemComponent,
    ClickOutsideDirective,
  ],
  providers: [ScrollbarService],
})
export class SharedModule {}
