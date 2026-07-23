// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * One qualification entry within an industry template preview. Mirrors
 * Klacks.Api Application/DTOs/IndustryTemplates/IndustryTemplateQualificationItem.cs, where
 * name/description are serialized MultiLanguage values (flat per-language-code object), not
 * plain strings — resolve with getLocalizedValue()/the fallback pipe before display.
 * @param name - Localized qualification name
 * @param description - Localized qualification description, or null when unset
 */
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';

export interface IIndustryTemplateQualificationEntry {
  name: IMultiLanguage;
  description: IMultiLanguage | null;
}
