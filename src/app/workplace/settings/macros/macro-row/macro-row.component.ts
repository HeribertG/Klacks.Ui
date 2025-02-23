import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  NgZone,
  OnChanges,
  ViewChild,
  OnDestroy,
} from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CreateEntriesEnum } from 'src/app/helpers/enums/client-enum';

import 'codemirror/mode/vbscript/vbscript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import { NgForm } from '@angular/forms';
import { IMacro, Macro } from 'src/app/core/macro-class';
import { MultiLanguage } from 'src/app/core/multi-language-class';

@Component({
    selector: 'app-macro-row',
    templateUrl: './macro-row.component.html',
    styleUrls: ['./macro-row.component.scss'],
    standalone: false
})
export class MacroRowComponent implements OnInit, OnChanges, OnDestroy {
  @ViewChild(NgForm, { static: false }) macroForm: NgForm | undefined;

  @Input() data: IMacro = new Macro();

  @Output() isChangingEvent = new EventEmitter<true>();
  @Output() isDeleteEvent = new EventEmitter();

  macroName = '';
  macroType = 0;
  macroKey = 0;
  obj = '';
  description?: MultiLanguage | undefined;
  tabId = 'macro';
  currentData = '';
  myData: any;

  test = '';

  objectForUnsubscribe: any;

  isReadOwnerDefinedValues = false;
  isReadStatusTemplateList = false;
  isReadSectionTemplateList = false;

  codeMirrorOptions: any = {
    mode: 'vbscript',
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: [
      'CodeMirror-linenumbers',
      'CodeMirror-foldgutter',
      'CodeMirror-lint-markers',
    ],
    setSize: 'width: 100% , height:200px',
    lint: true,
  };

  codeMirrorOptions1: any = {
    theme: 'material',
    mode: 'javascript',
    lineNumbers: true,
    lineWrapping: true,
    foldGutter: true,
    gutters: [
      'CodeMirror-linenumbers',
      'CodeMirror-foldgutter',
      'CodeMirror-lint-markers',
    ],

    lint: true,
  };
  dialogRef: any;

  constructor(private modalService: NgbModal, private zone: NgZone) {}

  ngOnInit(): void {
    if (this.macroForm) {
      this.objectForUnsubscribe = this.macroForm.valueChanges!.subscribe(
        (x) => {
          if (this.macroForm!.dirty) {
            this.onChange(true);
          }
        }
      );
    }
  }

  ngOnChanges(changes: any) {}

  ngOnDestroy(): void {
    if (this.objectForUnsubscribe) {
      this.objectForUnsubscribe.unsubscribe();
    }
  }
  onClickDelete() {
    this.isDeleteEvent.emit();
  }

  onChange(event: any) {
    this.zone.runOutsideAngular(() => {
      if (
        this.data!.isDirty === undefined ||
        this.data!.isDirty === CreateEntriesEnum.undefined
      ) {
        this.data!.isDirty = CreateEntriesEnum.rewrite;
      }

      this.onIsChanging(true);
    });
  }

  onIsChanging(event: any) {
    this.isChangingEvent.emit(event);
  }

  open(content: any) {
    this.macroName = this.data.name!;
    this.macroType = this.data.type;
    this.obj = this.data.content!;
    this.description = this.data.description;

    const tmp = document.getElementById('codeMirror') as HTMLElement;

    this.modalService.open(content, { size: 'lg', centered: true }).result.then(
      () => {
        this.data.name = this.macroName;
        this.data.type = +this.macroType;
        this.data.content = this.obj;
        this.data.description = this.description;

        this.onChange(true);
      },
      () => {}
    );
  }

  onClickData() {
    this.tabId = 'data';
    const codemirror: HTMLElement | null =
      document.getElementById('codemirror1');
    if (codemirror) {
      codemirror.focus();
    }
  }

  private macroFilter() {
    this.currentData = JSON.stringify(this.myData);

    this.currentData = this.currentData.split('{').join('{\n\t');
    this.currentData = this.currentData.split(',').join(',\n\t');
    this.currentData = this.currentData.split('}').join('\n}');
  }
}
