/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Subject, takeUntil } from 'rxjs';
import { IState } from 'src/app/domain/models/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

@Component({
  selector: 'app-state-row',
  templateUrl: './state-row.component.html',
  styleUrls: ['./state-row.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NgbModule],
})
export class StateRowComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() data: IState | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  public translate = inject(TranslateService);

  private ngUnsubscribe = new Subject<void>();

  ngOnInit(): void {
    this.currentLang = this.translate.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translate.currentLang as Language;
      });
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  onChange(event: any): void {
    this.updateDataDirtyState();
  }

  onKeyUp(event: any): void {
    this.updateDataDirtyState();
  }

  /**
   * Update the dirty state of the data object
   */
  private updateDataDirtyState(): void {
    if (this.data) {
      if (
        this.data.isDirty === undefined ||
        this.data.isDirty === CreateEntriesEnum.undefined
      ) {
        this.data.isDirty = CreateEntriesEnum.rewrite;
      }
    }
  }
}
