import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

import { 
  ReportTemplate, 
  ReportOrientation,
  ReportPageSize 
} from 'src/app/domain/models/report/report-template.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import { 
  ReportField, 
  ReportFieldType, 
  TextAlignment,
  AVAILABLE_DATA_BINDINGS,
  DEFAULT_FIELD_STYLE 
} from 'src/app/domain/models/report/report-field.model';
import { ReportSection } from 'src/app/domain/models/report/report-section.model';

@Component({
  selector: 'app-report-designer',
  templateUrl: './report-designer.component.html',
  styleUrls: ['./report-designer.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, CdkDrag, CdkDropList]
})
export class ReportDesignerComponent {
  @Input() template!: ReportTemplate;
  @Output() templateChange = new EventEmitter<ReportTemplate>();

  public translate = inject(TranslateService);

  selectedField: ReportField | null = null;
  selectedSection: ReportSection | null = null;

  // Available data bindings for drag & drop
  availableBindings = AVAILABLE_DATA_BINDINGS;

  // Section types for UI
  sectionTypes = [
    { value: ReportSectionType.Header, label: 'Header' },
    { value: ReportSectionType.PageHeader, label: 'Page Header' },
    { value: ReportSectionType.Detail, label: 'Detail' },
    { value: ReportSectionType.PageFooter, label: 'Page Footer' },
    { value: ReportSectionType.Footer, label: 'Footer' },
  ];

  // Field types for UI
  fieldTypes = [
    { value: ReportFieldType.Text, label: 'Text' },
    { value: ReportFieldType.Date, label: 'Date' },
    { value: ReportFieldType.Number, label: 'Number' },
    { value: ReportFieldType.Currency, label: 'Currency' },
    { value: ReportFieldType.Formula, label: 'Formula' },
  ];

  // Alignments for UI
  alignments = [
    { value: TextAlignment.Left, label: 'Left' },
    { value: TextAlignment.Center, label: 'Center' },
    { value: TextAlignment.Right, label: 'Right' },
  ];

  // Orientations for UI
  orientations = [
    { value: ReportOrientation.Portrait, label: 'Portrait' },
    { value: ReportOrientation.Landscape, label: 'Landscape' },
  ];

  // Page sizes for UI
  pageSizes = [
    { value: ReportPageSize.A4, label: 'A4' },
    { value: ReportPageSize.A3, label: 'A3' },
    { value: ReportPageSize.Letter, label: 'Letter' },
  ];

  getSectionTypeLabel(type: ReportSectionType): string {
    const found = this.sectionTypes.find(s => s.value === type);
    return found ? found.label : 'Unknown';
  }

  onSectionClick(section: ReportSection): void {
    this.selectedSection = section;
    this.selectedField = null;
  }

  onFieldClick(field: ReportField, section: ReportSection): void {
    this.selectedField = field;
    this.selectedSection = section;
  }

  addField(section: ReportSection): void {
    const newField: ReportField = {
      name: 'New Field',
      dataBinding: '',
      type: ReportFieldType.Text,
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE },
      sortOrder: section.fields.length
    };

    section.fields.push(newField);
    this.selectedField = newField;
    this.selectedSection = section;
    this.emitChange();
  }

  deleteField(section: ReportSection, field: ReportField): void {
    const index = section.fields.indexOf(field);
    if (index > -1) {
      section.fields.splice(index, 1);
      if (this.selectedField === field) {
        this.selectedField = null;
      }
      this.emitChange();
    }
  }

  addSection(): void {
    const newSection: ReportSection = {
      type: ReportSectionType.Detail,
      height: 50,
      fields: [],
      visible: true,
      sortOrder: this.template.sections.length
    };

    this.template.sections.push(newSection);
    this.selectedSection = newSection;
    this.selectedField = null;
    this.emitChange();
  }

  deleteSection(section: ReportSection): void {
    const index = this.template.sections.indexOf(section);
    if (index > -1) {
      this.template.sections.splice(index, 1);
      if (this.selectedSection === section) {
        this.selectedSection = null;
      }
      this.emitChange();
    }
  }

  dropField(event: CdkDragDrop<ReportField[]>, section: ReportSection): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(section.fields, event.previousIndex, event.currentIndex);
    } else {
      // Create new field from binding
      const binding = event.item.data as { key: string; label: string; type: ReportFieldType };
      const newField: ReportField = {
        name: binding.label,
        dataBinding: binding.key,
        type: binding.type,
        x: 10,
        y: 10,
        width: 100,
        height: 20,
        style: { ...DEFAULT_FIELD_STYLE },
        sortOrder: section.fields.length
      };
      section.fields.push(newField);
    }
    this.emitChange();
  }

  onFieldChange(): void {
    this.emitChange();
  }

  onPageSetupChange(): void {
    this.emitChange();
  }

  private emitChange(): void {
    this.templateChange.emit({ ...this.template });
  }
}
