// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Second step of the employee import: assign a target field to every column (with samples and the
 * detection confidence), choose the date format and name order, and set the rules for rows with
 * missing information (contract, group, entry date, default country, communication types, former
 * employees and duplicates).
 * @param state - Page-scoped import state provided by the import page
 */

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PercentPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientImportStateService } from 'src/app/domain/services/client/client-import-state.service';
import {
  ClientImportDateFormat,
  ClientImportDuplicateHandling,
  ClientImportEmailType,
  ClientImportFormerEmployeesHandling,
  ClientImportMobileType,
  ClientImportNameOrder,
  ClientImportPhoneType,
  ClientImportTarget,
} from 'src/app/domain/enums/client-import.enums';
import {
  CLIENT_IMPORT_COUNT_KEYS,
  CLIENT_IMPORT_TARGET_KEY_PREFIX,
  CLIENT_IMPORT_TARGETS,
} from 'src/app/domain/constants/client-import.constants';
import { IClientImportPolicy } from 'src/app/domain/models/client-import/i-client-import-policy';
import { IClientImportOption } from 'src/app/domain/models/client-import/i-client-import-option';
import { ICountry } from 'src/app/domain/models/client/i-country';
import { getLocalizedValue } from 'src/app/domain/helpers/multi-language.helper';
import { clientImportFileErrorKey } from 'src/app/domain/services/client/client-import-error.helper';
import { clientImportCountKey } from 'src/app/domain/services/client/client-import-count-key.helper';

const NO_SELECTION = '';
const INDENT = '  ';

@Component({
  selector: 'app-client-import-mapping-step',
  templateUrl: './client-import-mapping-step.component.html',
  styleUrls: ['./client-import-mapping-step.component.scss'],
  standalone: true,
  imports: [TranslateModule, PercentPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientImportMappingStepComponent {
  readonly state = inject(ClientImportStateService);
  readonly targets = CLIENT_IMPORT_TARGETS;
  readonly targetKeyPrefix = CLIENT_IMPORT_TARGET_KEY_PREFIX;
  readonly countKeys = CLIENT_IMPORT_COUNT_KEYS;
  readonly countKey = clientImportCountKey;
  readonly Ignore = ClientImportTarget.Ignore;
  readonly noSelection = NO_SELECTION;
  readonly dateFormats = Object.values(ClientImportDateFormat);
  readonly nameOrders = Object.values(ClientImportNameOrder);
  readonly emailTypes = Object.values(ClientImportEmailType);
  readonly phoneTypes = Object.values(ClientImportPhoneType);
  readonly mobileTypes = Object.values(ClientImportMobileType);
  readonly formerEmployeeOptions = Object.values(ClientImportFormerEmployeesHandling);
  readonly duplicateOptions = Object.values(ClientImportDuplicateHandling);

  private translate = inject(TranslateService);

  readonly rows = computed(() => {
    const parsed = this.state.parseResult();
    const mapping = this.state.mapping();
    if (!parsed) {
      return [];
    }
    return parsed.columns.map((column) => ({
      column,
      mapping: mapping.find((entry) => entry.columnIndex === column.index),
    }));
  });

  readonly hasSeveralSheets = computed(() => (this.state.parseResult()?.sheets.length ?? 0) > 1);

  fileErrorKey(): string | null {
    return clientImportFileErrorKey(this.state.fileErrorCode());
  }

  optionLabel(option: IClientImportOption): string {
    return INDENT.repeat(option.depth) + option.name;
  }

  countryLabel(country: ICountry): string {
    const name = getLocalizedValue(country.name, this.translate.currentLang);
    return name ? `${name} (${country.abbreviation})` : country.abbreviation;
  }

  onTargetChange(columnIndex: number, event: Event): void {
    this.state.setColumnTarget(columnIndex, this.valueOf(event) as ClientImportTarget);
  }

  onSheetChange(event: Event): void {
    void this.state.selectSheet(this.valueOf(event));
  }

  onDateFormatChange(event: Event): void {
    this.state.setDateFormat(this.valueOf(event) as ClientImportDateFormat);
  }

  onNameOrderChange(event: Event): void {
    this.state.setNameOrder(this.valueOf(event) as ClientImportNameOrder);
  }

  onEntryDateChange(event: Event): void {
    this.state.setEntryDate(this.valueOf(event) || null);
  }

  onOptionalPolicyChange(field: 'contractId' | 'groupId' | 'defaultCountry', event: Event): void {
    const value = this.valueOf(event);
    this.state.updatePolicy({ [field]: value === NO_SELECTION ? null : value });
  }

  onPolicyChange<K extends keyof IClientImportPolicy>(field: K, event: Event): void {
    this.state.updatePolicy({ [field]: this.valueOf(event) } as Partial<IClientImportPolicy>);
  }

  onNext(): void {
    this.state.goToPreview();
  }

  onRestart(): void {
    this.state.restart();
  }

  private valueOf(event: Event): string {
    return (event.target as HTMLSelectElement | HTMLInputElement).value;
  }
}
