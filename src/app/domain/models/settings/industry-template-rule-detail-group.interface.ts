// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One named group of label-value rows in a scheduling rule's expanded detail list (e.g.
 * "Working time", "Overtime"). Only non-empty groups are rendered.
 * @param headingKey - i18n key for the group heading
 * @param rows - Rows belonging to this group
 */
import { IIndustryTemplateRuleDetailRow } from 'src/app/domain/models/settings/industry-template-rule-detail-row.interface';

export interface IIndustryTemplateRuleDetailGroup {
  headingKey: string;
  rows: IIndustryTemplateRuleDetailRow[];
}
