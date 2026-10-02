// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { FallbackPipe } from './fallback.pipe';
import { IMultiLanguage } from 'src/app/domain/models/translation/multi-language-class';
import { DomainMessages } from 'src/app/domain/constants/messages';

describe('FallbackPipe', () => {
    let pipe: FallbackPipe;

    beforeEach(() => {
        pipe = new FallbackPipe();
    });

    it('should create an instance', () => {
        expect(pipe).toBeTruthy();
    });

    it('should return empty string if source is undefined', () => {
        expect(pipe.transform(undefined, 'en')).toBe('');
    });

    it('should return language-specific string if it exists', () => {
        const multiLang: IMultiLanguage = {
            de: 'hallo',
            fr: 'bonjour',
            it: 'ciao',
            en: 'hello',
        };
        expect(pipe.transform(multiLang, 'de')).toBe('hallo');
        expect(pipe.transform(multiLang, 'fr')).toBe('bonjour');
        expect(pipe.transform(multiLang, 'it')).toBe('ciao');
        expect(pipe.transform(multiLang, 'en')).toBe('hello');
    });

    it('should fall back to the default language if requested language does not exist', () => {
        const multiLang: IMultiLanguage = {
            de: 'hallo',
            fr: 'bonjour',
            it: undefined,
            en: 'hello',
        };
        expect(pipe.transform(multiLang, 'it')).toBe(
            multiLang[DomainMessages.DEFAULT_LANG as keyof IMultiLanguage]
        );
    });

    it('should show the only existing translation instead of an empty value', () => {
        const multiLang: IMultiLanguage = {
            de: 'hallo',
            fr: '',
            it: '',
            en: '',
        };
        expect(pipe.transform(multiLang, 'en')).toBe('hallo');
    });

    it('should fall back through the chain when requested and default language are missing', () => {
        const multiLang: IMultiLanguage = {
            de: '',
            fr: 'bonjour',
            it: '',
            en: undefined,
        };
        expect(pipe.transform(multiLang, 'it')).toBe('bonjour');
    });

    it('should resolve a mixed-case locale against the lower-case key (zh-CN -> zh-cn)', () => {
        const multiLang: IMultiLanguage = {
            de: 'Neujahr',
            en: 'New Year',
            'zh-cn': '元旦',
            'zh-tw': '元旦（繁）',
        };
        expect(pipe.transform(multiLang, 'zh-CN')).toBe('元旦');
        expect(pipe.transform(multiLang, 'zh-TW')).toBe('元旦（繁）');
    });

    it('should return empty string if no translation exists at all', () => {
        const multiLang: IMultiLanguage = {
            de: '',
            fr: '',
            it: '',
            en: '',
        };
        expect(pipe.transform(multiLang, 'de')).toBe('');
    });
});
