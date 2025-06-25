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
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { IconAngleRightComponent } from 'src/app/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/icons/icon-angle-down.component';
import { TrashIconRedComponent } from 'src/app/icons/trash-icon-red.component';
import { TrashIconLightRedComponent } from 'src/app/icons/trash-icon-light-red.component ';
import { GearGreyComponent } from 'src/app/icons/gear-grey.component';
import { FormsModule } from '@angular/forms';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { ButtonNewComponent } from 'src/app/shared/button-new/button-new.component';

@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    NgbTooltipModule,
    IconAngleRightComponent,
    IconAngleDownComponent,
    TrashIconRedComponent,
    TrashIconLightRedComponent,
    GearGreyComponent,
    TranslateModule,
    ButtonNewComponent,
  ],
})
export class NoteComponent implements OnInit, AfterViewInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  public note_new = MessageLibrary.NOTE_NEW;
  public visibleTable = 'inline';
  public expandedNotes: boolean[] = [];

  public dataManagementClientService = inject(DataManagementClientService);

  private authorizationService = inject(AuthorizationService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.note_new = MessageLibrary.NOTE_NEW;
    if (this.dataManagementClientService.editClient?.annotations) {
      this.expandedNotes = new Array(
        this.dataManagementClientService.editClient.annotations.length
      ).fill(false);
    } else {
      this.expandedNotes = [];
    }
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange.subscribe(() => {
      setTimeout(() => {
        this.note_new = MessageLibrary.NOTE_NEW;
      }, 200);
    });
  }

  isDisabled(): boolean {
    return (
      this.dataManagementClientService.editClientDeleted ||
      !this.authorizationService.isAuthorised
    );
  }

  getFirstLine(text: string | undefined): string {
    if (!text) return '';
    const firstLineEnd = text.indexOf('\n');
    return firstLineEnd > -1 ? text.substring(0, firstLineEnd) : text;
  }

  toggleNoteExpansion(index: number, event: MouseEvent | KeyboardEvent): void {
    event.stopPropagation();

    if (event instanceof KeyboardEvent && event.code === 'Space') {
      event.preventDefault();
    }

    this.expandedNotes[index] = !this.expandedNotes[index];

    setTimeout(() => {
      const button = (event.target as HTMLElement).closest(
        '.toggle-note-button'
      );
      if (button) {
        (button as HTMLElement).focus();
      }
    }, 0);
  }

  onChange(index: number, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      this.dataManagementClientService.editClient!.annotations[index].note =
        target.value;
      this.isChangingEvent.emit(true);
    }
  }

  newAnnotation() {
    this.dataManagementClientService.addAnnotation();
    this.expandedNotes.push(false);
  }

  onDeleteCurrentAnnotation() {
    const currentIndex =
      this.dataManagementClientService.currentAnnotationIndex;
    this.dataManagementClientService.removeCurrentAnnotation();
    if (currentIndex > -1 && currentIndex < this.expandedNotes.length) {
      this.expandedNotes.splice(currentIndex, 1);
    }
    this.isChangingEvent.emit(true);
  }

  onFocus(index: number) {
    if (this.isDisabled()) {
      return;
    }

    this.dataManagementClientService.currentAnnotationIndex = index;
  }

  onClickVisibleTable() {
    this.visibleTable = this.visibleTable == 'inline' ? 'none' : 'inline';
  }

  handleKeyDown(index: number, event: Event): void {
    if (
      (event as KeyboardEvent).key === 'Enter' ||
      (event as KeyboardEvent).key === ' '
    ) {
      this.toggleNoteExpansion(index, event as KeyboardEvent);
    }
  }
}
