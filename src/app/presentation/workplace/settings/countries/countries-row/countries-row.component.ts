import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  inject,
  effect,
  signal,
} from '@angular/core';
import { form, Field, debounce } from '@angular/forms/signals';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { ICountry } from 'src/app/domain/models/client/client-class';
import { CreateEntriesEnum } from 'src/app/domain/enums/client-enum';
import { Language } from 'src/app/application/helpers/sharedItems';
import { DomainMessages } from 'src/app/domain/constants/messages';

interface CountryModel {
  abbreviation: string;
  nameDe: string;
  nameEn: string;
  nameFr: string;
  nameIt: string;
  prefix: string;
}

@Component({
  selector: 'app-countries-row',
  templateUrl: './countries-row.component.html',
  styleUrls: ['./countries-row.component.scss'],
  standalone: true,
  imports: [TranslateModule, Field],
})
export class CountriesRowComponent implements OnInit, OnChanges, OnDestroy {
  @Input() data: ICountry | undefined;
  @Output() isDeleteEvent = new EventEmitter<void>();
  @Output() isChangingEvent = new EventEmitter<void>();

  currentLang: Language = DomainMessages.DEFAULT_LANG;

  public translate = inject(TranslateService);
  private translateService = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  private isInitialized = false;
  private lastModel: CountryModel | null = null;
  private countryModel = signal<CountryModel>({
    abbreviation: '',
    nameDe: '',
    nameEn: '',
    nameFr: '',
    nameIt: '',
    prefix: '',
  });
  countryForm = form(this.countryModel, f => {
    debounce(f.abbreviation, 500);
    debounce(f.nameDe, 500);
    debounce(f.nameEn, 500);
    debounce(f.nameFr, 500);
    debounce(f.nameIt, 500);
    debounce(f.prefix, 500);
  });

  constructor() {
    effect(() => {
      const model = this.countryModel();
      if (this.isInitialized && this.data && this.hasModelChanged(model)) {
        this.data.abbreviation = model.abbreviation;
        this.data.name!.de = model.nameDe;
        this.data.name!.en = model.nameEn;
        this.data.name!.fr = model.nameFr;
        this.data.name!.it = model.nameIt;
        this.data.prefix = model.prefix;
        this.lastModel = { ...model };
        this.updateDataDirtyState();
      }
    });
  }

  private hasModelChanged(model: CountryModel): boolean {
    if (!this.lastModel) return false;
    return (
      model.abbreviation !== this.lastModel.abbreviation ||
      model.nameDe !== this.lastModel.nameDe ||
      model.nameEn !== this.lastModel.nameEn ||
      model.nameFr !== this.lastModel.nameFr ||
      model.nameIt !== this.lastModel.nameIt ||
      model.prefix !== this.lastModel.prefix
    );
  }

  ngOnInit(): void {
    this.currentLang = this.translateService.currentLang as Language;

    this.translateService.onLangChange
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(() => {
        this.currentLang = this.translateService.currentLang as Language;
      });
  }

  ngOnChanges(): void {
    if (this.data) {
      const initialModel: CountryModel = {
        abbreviation: this.data.abbreviation || '',
        nameDe: this.data.name?.de || '',
        nameEn: this.data.name?.en || '',
        nameFr: this.data.name?.fr || '',
        nameIt: this.data.name?.it || '',
        prefix: this.data.prefix || '',
      };
      this.countryModel.set(initialModel);
      this.lastModel = { ...initialModel };
      this.isInitialized = true;
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  private updateDataDirtyState(): void {
    if (this.data) {
      if (
        this.data.isDirty === undefined ||
        this.data.isDirty === CreateEntriesEnum.undefined
      ) {
        this.data.isDirty = CreateEntriesEnum.rewrite;
      }
      this.isChangingEvent.emit();
    }
  }
}
