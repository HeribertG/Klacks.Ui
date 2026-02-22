// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { replaceUmlaud, validateEmail } from './string.helper';

describe('String Helper Functions', () => {
    describe('replaceUmlaut', () => {
        it('should replace lowercase umlauts', () => {
            const input = 'äöüss';
            const output = replaceUmlaud(input);
            expect(output).toEqual('aouss');
        });

        it('should replace uppercase umlauts', () => {
            const input = 'ÄÖÜ';
            const output = replaceUmlaud(input);
            expect(output).toEqual('aou');
        });

        it('should handle strings without umlauts', () => {
            const input = 'abcd';
            const output = replaceUmlaud(input);
            expect(output).toEqual('abcd');
        });

        it('should handle empty strings', () => {
            const output = replaceUmlaud('');
            expect(output).toEqual('');
        });

        it('should handle mixed case strings', () => {
            const input = 'AäBbÖoÜu';
            const output = replaceUmlaud(input);
            expect(output).toEqual('aabboouu');
        });
    });

    describe('validateEmail', () => {
        it('should return true for valid email addresses', () => {
            const validEmails = [
                'test@example.com',
                'test.email@example.com',
                'user+name@example.com',
                'test.email+alex@leetcode.com',
            ];

            validEmails.forEach((email) => {
                expect(validateEmail(email)).toBe(true);
            });
        });

        it('should return false for invalid email addresses', () => {
            const invalidEmails = [
                'plainaddress',
                '@missingusername.com',
                'username@.com',
                'username@.com.com',
                'username@.com.',
                '.username@example.com',
            ];

            invalidEmails.forEach((email) => {
                expect(validateEmail(email)).toBe(false);
            });
        });

        it('should return false for empty string', () => {
            expect(validateEmail('')).toBe(false);
        });

        it('should return false for undefined', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expect(validateEmail(undefined as any)).toBe(false);
        });
    });
});
