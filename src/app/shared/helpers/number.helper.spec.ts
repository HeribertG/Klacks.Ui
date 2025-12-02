import { isNumeric } from './number.helper';

describe('Number Helper Functions', () => {
    describe('isNumeric', () => {
        it('should return true for numeric values', () => {
            const numericValues = [123, '123', '123.45', -123, '-123.45'];

            numericValues.forEach((value) => {
                expect(isNumeric(value)).toBe(true);
            });
        });

        it('should return false for non-numeric values', () => {
            const nonNumericValues = [
                'abc',
                '',
                null,
                undefined,
                {},
                [],
                true,
                false,
            ];

            nonNumericValues.forEach((value) => {
                expect(isNumeric(value)).toBe(false);
            });
        });
    });
});
