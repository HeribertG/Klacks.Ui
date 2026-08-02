// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Resolves the display label of a report field at render time.
 * The label is looked up from the data binding instead of the stored field name, so a template
 * built in one language prints its column headers in the language of the reader.
 * @param field - Field to label
 * @param template - Template the field belongs to, needed for source and data sets
 * @param translate - Translation function
 * @param withPrefix - Prefixes the data set name when several sets share a label
 */

import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { getAllFieldsForDataSets, getFieldPrefixMap } from 'src/app/domain/models/report/report-data-source.model';

const FALLBACK_SOURCE_ID = 'schedule';
const FALLBACK_DATA_SET_ID = 'work';

export function resolveReportFieldLabel(
  field: ReportField,
  template: ReportTemplate,
  translate: (key: string) => string,
  withPrefix = true
): string {
  const sourceId = template.sourceId ?? FALLBACK_SOURCE_ID;
  const dataSetIds = template.dataSetIds ?? [FALLBACK_DATA_SET_ID];
  const definition = getAllFieldsForDataSets(sourceId, dataSetIds).find(f => f.key === field.dataBinding);

  if (!definition) {
    return field.name;
  }

  const label = translate(definition.i18nKey);
  if (!withPrefix) {
    return label;
  }

  const prefix = getFieldPrefixMap(sourceId, dataSetIds, translate).get(field.dataBinding);
  return prefix ? `${prefix}.${label}` : label;
}
