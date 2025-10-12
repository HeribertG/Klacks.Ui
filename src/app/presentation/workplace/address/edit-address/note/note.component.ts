import { DataManagementClientService } from 'src/app/domain/services/client/data-management-client.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  AfterViewInit,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  Injector,
  OnInit,
  Output,
} from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { TrashIconRedComponent } from 'src/app/presentation/icons/trash-icon-red.component';
import { TrashIconLightRedComponent } from 'src/app/presentation/icons/trash-icon-light-red.component ';
import { FormsModule } from '@angular/forms';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ButtonNewComponent } from 'src/app/presentation/shared/button-new/button-new.component';
import { OtherGreyComponent } from 'src/app/presentation/icons/icon-other-grey.component';
import { RichTextEditorComponent } from 'src/app/presentation/shared/rich-text-editor/rich-text-editor.component';
import { TextFormatterService } from 'src/app/presentation/shared/rich-text-editor/text-formatter.service';
import { ExpandableCardComponent } from 'src/app/presentation/shared/expandable-card/expandable-card.component';

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
    OtherGreyComponent,
    TranslateModule,
    ButtonNewComponent,
    RichTextEditorComponent,
    ExpandableCardComponent,
  ],
})
export class NoteComponent implements OnInit, AfterViewInit {
  @Output() isChangingEvent = new EventEmitter<boolean>();
  public note_new = MessageLibrary.NOTE_NEW;
  public expandedNotes: boolean[] = [];

  public dataManagementClientService = inject(DataManagementClientService);
  public textFormatterService = inject(TextFormatterService);

  private authorizationService = inject(AuthorizationService);
  private translate = inject(TranslateService);
  private injector = inject(Injector);
  private isInitializing = false;

  public sortedAnnotations: any[] = [];

  ngOnInit(): void {
    this.note_new = MessageLibrary.NOTE_NEW;
    this.initializeExpandedNotes();

    effect(() => {
      const client = this.dataManagementClientService.editClient();
      if (client?.annotations && !this.isInitializing) {
        this.initializeExpandedNotes();
      }
    }, { injector: this.injector });
  }

  private initializeExpandedNotes(): void {
    const annotations = this.dataManagementClientService.editClient()?.annotations;
    if (annotations) {
      this.sortedAnnotations = [...annotations];
      this.expandedNotes = new Array(annotations.length).fill(false);
      if (this.expandedNotes.length > 0) {
        this.expandedNotes[0] = true;
      }
    } else {
      this.sortedAnnotations = [];
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
      this.dataManagementClientService.editClientDeleted() ||
      !this.authorizationService.isAuthorised
    );
  }

  getFirstLine(text: string | undefined): string {
    if (!text) return '';
    const firstLineEnd = text.indexOf('\n');
    return firstLineEnd > -1 ? text.substring(0, firstLineEnd) : text;
  }

  toggleNoteExpansion(
    sortedIndex: number,
    event: MouseEvent | KeyboardEvent
  ): void {
    event.stopPropagation();

    if (event instanceof KeyboardEvent && event.code === 'Space') {
      event.preventDefault();
    }

    const originalIndex = this.getOriginalIndex(sortedIndex);
    this.expandedNotes[originalIndex] = !this.expandedNotes[originalIndex];

    setTimeout(() => {
      if (event.target) {
        const button = (event.target as HTMLElement).closest(
          '.toggle-note-button'
        );
        if (button) {
          (button as HTMLElement).focus();
        }
      }
    }, 0);
  }

  getOriginalIndex(sortedIndex: number): number {
    return sortedIndex;
  }

  onChange(sortedIndex: number, event: Event) {
    const target = event.target as HTMLTextAreaElement;
    if (target) {
      const originalIndex = this.getOriginalIndex(sortedIndex);
      this.dataManagementClientService.editClient.update((client) => {
        if (client) {
          client.annotations[originalIndex].note = target.value;
        }
        return client;
      });
      this.isChangingEvent.emit(true);
    }
  }

  newAnnotation() {
    this.isInitializing = true;
    this.dataManagementClientService.addAnnotation();
    setTimeout(() => {
      const annotations = this.dataManagementClientService.editClient()?.annotations;
      if (annotations) {
        this.expandedNotes.unshift(true);
        this.sortedAnnotations = [...annotations];
      }
      this.isChangingEvent.emit(true);
      this.isInitializing = false;
    }, 0);
  }

  onDeleteCurrentAnnotation() {
    const currentIndex =
      this.dataManagementClientService.currentAnnotationIndex();

    if (currentIndex === -1) {
      return;
    }

    this.isInitializing = true;
    this.dataManagementClientService.removeCurrentAnnotation();

    setTimeout(() => {
      if (currentIndex > -1 && currentIndex < this.expandedNotes.length) {
        this.expandedNotes.splice(currentIndex, 1);
      }

      const annotations = this.dataManagementClientService.editClient()?.annotations;
      if (annotations) {
        this.sortedAnnotations = [...annotations];
      }

      this.dataManagementClientService.clientEditService.currentAnnotationIndex.set(-1);
      this.isChangingEvent.emit(true);
      this.isInitializing = false;
    }, 0);
  }

  onFocus(sortedIndex: number) {
    if (this.isDisabled()) {
      return;
    }

    const originalIndex = this.getOriginalIndex(sortedIndex);
    this.dataManagementClientService.clientEditService.currentAnnotationIndex.set(
      originalIndex
    );
  }

  handleKeyDown(index: number, event: Event): void {
    if (
      (event as KeyboardEvent).key === 'Enter' ||
      (event as KeyboardEvent).key === ' '
    ) {
      this.toggleNoteExpansion(index, event as KeyboardEvent);
    }
  }

  onContentChange(sortedIndex: number, content: string): void {
    const originalIndex = this.getOriginalIndex(sortedIndex);
    this.dataManagementClientService.editClient.update((client) => {
      if (client) {
        client.annotations[originalIndex].note = content;
      }
      return client;
    });
    this.isChangingEvent.emit(true);
  }
}
