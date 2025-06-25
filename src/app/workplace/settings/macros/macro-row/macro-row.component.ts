/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';

import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';
import { IMacro, Macro } from 'src/app/core/macro-class';
import { MultiLanguage } from 'src/app/core/multi-language-class';
import { Subscription } from 'rxjs';
import { PropertyGridComponent } from '../property-grid/property-grid.component';

// Codemirror imports
import 'codemirror/mode/vbscript/vbscript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/display/autorefresh';
import { ShiftData } from 'src/app/core/shift-data-class';

@Component({
  selector: 'app-macro-row',
  templateUrl: './macro-row.component.html',
  styleUrls: ['./macro-row.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NgbModule,
    CodemirrorModule,
    PropertyGridComponent,
  ],
})
export class MacroRowComponent implements OnInit, OnDestroy {
  @ViewChild(NgForm, { static: false }) macroForm: NgForm | undefined;
  @Input() data: IMacro = new Macro();
  @Output() isChangingEvent = new EventEmitter<true>();
  @Output() isDeleteEvent = new EventEmitter<void>();

  public translate = inject(TranslateService);
  private modalService = inject(NgbModal);

  macroName = '';
  macroType = 0;
  macroKey = 0;
  obj = '';
  description?: MultiLanguage;
  tabId = 'macro';
  currentData = '';
  myData: any;

  shiftData = new ShiftData();

  test = '';

  private formSubscription?: Subscription;

  isReadOwnerDefinedValues = false;
  isReadStatusTemplateList = false;
  isReadSectionTemplateList = false;

  codeMirrorOptions = {
    mode: 'vbscript',
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: [
      'CodeMirror-linenumbers',
      'CodeMirror-foldgutter',
      'CodeMirror-lint-markers',
    ],
    lint: true,
    viewportMargin: Infinity,
    autoRefresh: true,
    theme: 'default',
  };

  dialogRef: any;

  ngOnInit(): void {
    if (this.macroForm?.valueChanges) {
      this.formSubscription = this.macroForm.valueChanges.subscribe(() => {
        if (this.macroForm?.dirty) {
          this.onChange(true);
        }
      });
    }
  }

  ngOnDestroy(): void {
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }
  }

  onClickDelete(): void {
    this.isDeleteEvent.emit();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onChange(event: boolean): void {
    if (
      this.data &&
      (this.data.isDirty === undefined ||
        this.data.isDirty === CreateEntriesEnum.undefined)
    ) {
      this.data.isDirty = CreateEntriesEnum.rewrite;
    }

    this.onIsChanging(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onIsChanging(event: boolean): void {
    this.isChangingEvent.emit(true);
  }

  open(content: any): void {
    if (this.data) {
      this.macroName = this.data.name || '';
      this.macroType = this.data.type;
      this.obj = this.data.content || '';
      this.description = this.data.description;
    }

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      () => {
        if (this.data) {
          this.data.name = this.macroName;
          this.data.type = +this.macroType;
          this.data.content = this.obj;
          this.data.description = this.description;
        }

        this.onChange(true);
      },
      () => {} // Dismiss handler
    );
  }

  onClickData(): void {
    this.tabId = 'data';
    const codemirror = document.getElementById('codemirror1');
    if (codemirror) {
      codemirror.focus();
    }
  }

  private macroFilter(): void {
    this.currentData = JSON.stringify(this.myData);

    this.currentData = this.currentData.split('{').join('{\n\t');
    this.currentData = this.currentData.split(',').join(',\n\t');
    this.currentData = this.currentData.split('}').join('\n}');
  }
}
