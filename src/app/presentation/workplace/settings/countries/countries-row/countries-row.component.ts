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

import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { Subject, takeUntil } from 'rxjs';
import { ICountry } from 'src/app/domain/models/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/application/helpers/sharedItems';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';

@Component({
  selector: 'app-countries-row',
  templateUrl: './countries-row.component.html',
  styleUrls: ['./countries-row.component.scss'],
  standalone: true,
  imports: [FormsModule, TranslateModule, NgbModule],
})
export class CountriesRowComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() data: ICountry | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();

  currentLang: Language = MessageLibrary.DEFAULT_LANG;

  public translate = inject(TranslateService);

  private ngUnsubscribe = new Subject<void>();
  private translateService = inject(TranslateService);

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;
  }

  ngAfterViewInit(): void {
    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
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
