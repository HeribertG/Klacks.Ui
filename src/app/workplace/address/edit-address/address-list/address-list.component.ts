import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { CalendarIconComponent } from 'src/app/icons/calendar-icon.component';
import { ChooseCalendarComponent } from 'src/app/icons/choose-calendar.component';
import { ExcelComponent } from 'src/app/icons/excel.component';
import { GearGreyComponent } from 'src/app/icons/gear-grey.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconCopyGreyComponent } from 'src/app/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { TrashIconLightRedComponent } from 'src/app/icons/trash-icon-light-red.component ';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';

@Component({
  selector: 'app-address-list',
  templateUrl: './address-list.component.html',
  styleUrls: ['./address-list.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
  ],
})
export class AddressListComponent {}
