import { DataManagementClientService } from 'src/app/data/management/data-management-client.service';
import { MessageLibrary } from 'src/app/helpers/string-constants';
import { TranslateService } from '@ngx-translate/core';
import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnInit,
  Output,
} from '@angular/core';

@Component({
    selector: 'app-note',
    templateUrl: './note.component.html',
    styleUrls: ['./note.component.scss'],
    standalone: false
})
export class NoteComponent implements OnInit, AfterViewInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  note_new = MessageLibrary.NOTE_NEW;

  visibleTable = 'inline';

  constructor(
    public dataManagementClientService: DataManagementClientService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.note_new = MessageLibrary.NOTE_NEW;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange.subscribe(() => {
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
