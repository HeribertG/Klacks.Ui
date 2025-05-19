import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PropertyMetadata,
  ShiftData,
  ShiftType,
  Weekday,
} from 'src/app/core/shift-data-class';

interface PropertyItem {
  key: string;
  value: any;
  type: string;
  editable: boolean;
  metadata?: any;
}

interface EnumOption {
  name: string;
  value: number;
}

@Component({
  selector: 'app-property-grid',
  templateUrl: './property-grid.component.html',
  styleUrl: './property-grid.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class PropertyGridComponent implements OnInit {
  @Input() object: any = {};
  @Input() readOnly = false;
  @Input() excludeProps: string[] = [];
  @Input() metadata?: PropertyMetadata;

  shiftTypeOptions: EnumOption[] = [];
  weekdayOptions: EnumOption[] = [];

  public properties = signal<PropertyItem[]>([]);
  public Math = Math;

  constructor() {
    this.shiftTypeOptions = this.getEnumValues(ShiftType);
    this.weekdayOptions = this.getEnumValues(Weekday);
  }

  ngOnInit() {
    this.parseObject();
  }

  /**
   * Konvertiert ein Enum in ein Array von Optionen für Dropdowns
   */
  getEnumValues(enumType: any): EnumOption[] {
    const result: EnumOption[] = [];

    // Nur die String-Keys des Enums nehmen (nicht die Reverse-Mappings)
    Object.keys(enumType)
      .filter((key) => isNaN(Number(key)))
      .forEach((key) => {
        result.push({
          name: key,
          value: enumType[key as keyof typeof enumType] as number,
        });
      });

    return result;
  }

  parseObject() {
    if (!this.object) return;

    // Wenn keine expliziten Metadaten übergeben wurden, prüfen ob es sich um ShiftData handelt
    if (!this.metadata && this.object instanceof ShiftData) {
      this.metadata = ShiftData.metadata;
    }

    const props: PropertyItem[] = [];

    for (const key in this.object) {
      // Skip excluded properties or functions
      if (
        this.excludeProps.includes(key) ||
        typeof this.object[key] === 'function' ||
        key.startsWith('_')
      )
        continue;

      const value = this.object[key];
      // Erkennung der Typen basierend auf Eigenschaftsnamen
      const type = this.getPropertyType(value, key);

      props.push({
        key,
        value,
        type,
        editable: !this.readOnly && this.isEditable(type),
        metadata: this.metadata?.[key], // Metadaten für diese Eigenschaft
      });
    }

    this.properties.set(props);
  }

  getPropertyType(value: any, key: string): string {
    if (value === null || value === undefined) return 'null';
    if (value instanceof Date) return 'date';

    // Explizite Typerkennung für bekannte Enum-Eigenschaften
    if (key === 'shiftType') return 'shiftType';
    if (key === 'weekdayNumber') return 'weekday';

    const type = typeof value;
    return type;
  }

  isEditable(type: string): boolean {
    return [
      'string',
      'number',
      'boolean',
      'date',
      'shiftType',
      'weekday',
    ].includes(type);
  }

  displayValue(prop: PropertyItem): string {
    if (prop.value === null || prop.value === undefined) return '';

    switch (prop.type) {
      case 'boolean':
        return prop.value ? 'Ja' : 'Nein';
      case 'date':
        return this.formatDate(prop.value);
      case 'object':
        return '[Objekt]';
      case 'shiftType': {
        const option = this.shiftTypeOptions.find(
          (opt) => opt.value === prop.value
        );
        return option ? option.name : String(prop.value);
      }
      case 'weekday': {
        const option = this.weekdayOptions.find(
          (opt) => opt.value === prop.value
        );
        return option ? option.name : String(prop.value);
      }
      case 'number': {
        // Formatierung der Dezimalstellen basierend auf den Metadaten
        if (prop.metadata?.decimals !== undefined) {
          return prop.value.toFixed(prop.metadata.decimals);
        }
        return String(prop.value);
      }
      default:
        return String(prop.value);
    }
  }

  formatDate(date: Date): string {
    if (!date) return '';
    if (typeof date === 'string') return date;

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    return d.toISOString().split('T')[0];
  }

  updateProperty(key: string, value: any) {
    if (this.object) {
      this.object[key] = value;
    }
  }

  // Handler für Checkbox-Change-Events
  handleCheckboxChange(event: Event, key: string) {
    const checkbox = event.target as HTMLInputElement;
    this.updateProperty(key, checkbox.checked);
  }

  // Handler für Date-Change-Events
  handleDateChange(event: Event, key: string) {
    const input = event.target as HTMLInputElement;
    this.updateDateProperty(key, input.value);
  }

  // Handler für Enum-Change-Events
  handleEnumChange(event: Event, key: string) {
    const select = event.target as HTMLSelectElement;
    this.updateProperty(key, Number(select.value));
  }

  // Handler für Number-Change-Events mit Validierung
  handleNumberChange(event: Event, prop: PropertyItem) {
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);

    // Validierung mit Metadaten
    if (prop.metadata) {
      if (prop.metadata.min !== undefined && value < prop.metadata.min) {
        value = prop.metadata.min;
      }
      if (prop.metadata.max !== undefined && value > prop.metadata.max) {
        value = prop.metadata.max;
      }
      // Runden auf die angegebene Anzahl von Dezimalstellen
      if (prop.metadata.decimals !== undefined) {
        const factor = Math.pow(10, prop.metadata.decimals);
        value = Math.round(value * factor) / factor;
      }
    }

    this.updateProperty(prop.key, value);

    // Update input value to reflect validated value
    input.value = value.toString();
  }

  updateDateProperty(key: string, dateStr: string) {
    if (this.object) {
      this.object[key] = new Date(dateStr);
    }
  }

  trackByKey(index: number, item: PropertyItem): string {
    return item.key;
  }
}
