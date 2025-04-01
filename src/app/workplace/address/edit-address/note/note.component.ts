import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  inject,
  OnInit,
  Output,
} from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { IconCopyGreyComponent } from 'src/app/icons/icon-copy-grey.component';
import { PencilIconGreyComponent } from 'src/app/icons/pencil-icon-grey.component';
import { ExcelComponent } from 'src/app/icons/excel.component';
import { CalendarIconComponent } from 'src/app/icons/calendar-icon.component';
import { ChooseCalendarComponent } from 'src/app/icons/choose-calendar.component';
import { TrashIconLightRedComponent } from 'src/app/icons/trash-icon-light-red.component ';
import { GearGreyComponent } from 'src/app/icons/gear-grey.component';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbTooltipModule,
    SharedModule,
    IconAngleRightComponent,
    IconAngleDownComponent,
    TrashIconRedComponent,
    IconCopyGreyComponent,
    PencilIconGreyComponent,
    ExcelComponent,
    IconCopyGreyComponent,
    CalendarIconComponent,
    ChooseCalendarComponent,
    TrashIconLightRedComponent,
    GearGreyComponent,
  ],
})
export class NoteComponent implements OnInit, AfterViewInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  public note_new = MessageLibrary.NOTE_NEW;

  public visibleTable = 'inline';

  public dataManagementClientService = inject(DataManagementClientService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.note_new = MessageLibrary.NOTE_NEW;
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange.subscribe(() => {
      setTimeout(() => {
        this.note_new = MessageLibrary.NOTE_NEW;
      }, 200);
    });
  }

  setName(index: number): string {
    return 'note' + index.toString();
  }

  onChange(index: number, event: any) {
    const txt = event.srcElement.value;
    this.dataManagementClientService.editClient!.annotations[index].note = txt;
    this.isChangingEvent.emit(true);
  }

  onKeyUp(index: number, event: any) {
    event.cancelBubble = true;

    const txt = event.srcElement.value;
    this.dataManagementClientService.editClient!.annotations[index].note = txt;
    this.isChangingEvent.emit(true);
  }

  newAnnotation() {
    this.dataManagementClientService.addAnnotation();
  }

  onDeleteCurrentAnnotation() {
    this.dataManagementClientService.removeCurrentAnnotation();
    this.isChangingEvent.emit(true);
  }

  onFocus(index: number) {
    this.dataManagementClientService.currentAnnotationIndex = index;
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }
}
