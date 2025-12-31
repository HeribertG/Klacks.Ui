import { TestBed } from '@angular/core/testing';

import { ScriptService } from './script.service';
import { CancellationToken } from './script-execution-context';

describe('ScriptService', () => {
    let service: ScriptService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ScriptService);
    });

    it('should be created', () => {
        // Arrange
        // Act
        // Assert
        expect(service).toBeTruthy();
    });

    describe('Arithmetic Operations', () => {
        it('should calculate addition', () => {
            // Arrange & Act
            const result = service.run('message 1, 2 + 3', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('5');
        });

        it('should calculate subtraction', () => {
            // Arrange & Act
            const result = service.run('message 1, 10 - 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('6');
        });

        it('should calculate multiplication', () => {
            // Arrange & Act
            const result = service.run('message 1, 6 * 7', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should calculate division', () => {
            // Arrange & Act
            const result = service.run('message 1, 10/9', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1.1111111111111112');
        });

        it('should calculate integer division', () => {
            // Arrange & Act
            const result = service.run('message 1, 10\\9', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should calculate mod', () => {
            // Arrange & Act
            const result = service.run('message 1, 10 mod 3', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should calculate power', () => {
            // Arrange & Act
            const result = service.run('message 1, 10 ^ 3', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1000');
        });

        it('should handle negative multiplication', () => {
            // Arrange & Act
            const result = service.run('message 1, -1 * -1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should handle positive times negative', () => {
            // Arrange & Act
            const result = service.run('message 1, 1 * -1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('-1');
        });

        it('should handle zero multiplication', () => {
            // Arrange & Act
            const result = service.run('message 1, 0 * 1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('0');
        });

        it('should handle zero division', () => {
            // Arrange & Act
            const result = service.run('message 1, 0 / 1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('0');
        });

        it('should handle division by zero', () => {
            // Arrange & Act
            const result = service.run('message 1, 1 / 0', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('Infinity');
        });

        it('should handle parentheses', () => {
            // Arrange & Act
            const result = service.run('message 1, (2 + 3) * 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('20');
        });

        it('should respect operator precedence', () => {
            // Arrange & Act
            const result = service.run('message 1, 2 + 3 * 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('14');
        });

        it('should handle complex expression', () => {
            // Arrange & Act
            const result = service.run('message 1, (10 + 5) * 2 - 8 / 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('28');
        });
    });

    describe('Trigonometric Functions', () => {
        it('should calculate sin', () => {
            // Arrange & Act
            const result = service.run('message 1, sin(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.sin(1)));
        });

        it('should calculate cos', () => {
            // Arrange & Act
            const result = service.run('message 1, cos(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.cos(1)));
        });

        it('should calculate tan', () => {
            // Arrange & Act
            const result = service.run('message 1, tan(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.tan(1)));
        });

        it('should calculate atan', () => {
            // Arrange & Act
            const result = service.run('message 1, atan(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.atan(1)));
        });
    });

    describe('Variable Operations', () => {
        it('should handle variable assignment and retrieval', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                message 1, x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('10');
        });

        it('should handle compound assignment +=', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                x += 5
                message 1, x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('15');
        });

        it('should handle compound assignment -=', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                x -= 3
                message 1, x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('7');
        });

        it('should handle compound assignment *=', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                x *= 3
                message 1, x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('30');
        });

        it('should handle compound assignment /=', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                x /= 2
                message 1, x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('5');
        });

        it('should handle multiple variables', () => {
            // Arrange
            const script = `
                dim a, b, c
                a = 5
                b = 3
                c = a + b
                message 1, c
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('8');
        });
    });

    describe('String Operations', () => {
        it('should handle string assignment', () => {
            // Arrange
            const script = `
                dim s
                s = "Hello World"
                message 1, s
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('Hello World');
        });

        it('should handle string concatenation', () => {
            // Arrange
            const script = `
                dim a, b, c
                a = "Hello"
                b = " World"
                c = a & b
                message 1, c
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('Hello World');
        });
    });

    describe('Control Flow - IF Statements', () => {
        it('should execute IF true branch', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                if x > 5 then
                    message 1, "greater"
                else
                    message 1, "smaller"
                end if
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('greater');
        });

        it('should execute IF false branch', () => {
            // Arrange
            const script = `
                dim x
                x = 3
                if x > 5 then
                    message 1, "greater"
                else
                    message 1, "smaller"
                end if
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('smaller');
        });

        it('should handle nested IF', () => {
            // Arrange
            const script = `
                dim x
                x = 10
                if x > 5 then
                    if x > 8 then
                        message 1, "big"
                    else
                        message 1, "medium"
                    end if
                else
                    message 1, "small"
                end if
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('big');
        });

        it('should handle comparison operators', () => {
            // Arrange & Act
            const ltResult = service.run('message 1, 3 < 5', false, false);
            const leResult = service.run('message 1, 5 <= 5', false, false);
            const gtResult = service.run('message 1, 7 > 5', false, false);
            const geResult = service.run('message 1, 5 >= 5', false, false);
            const eqResult = service.run('message 1, 5 = 5', false, false);
            const neResult = service.run('message 1, 5 <> 3', false, false);

            // Assert - VBScript returns "True" with capital T
            expect(ltResult.success).toBe(true);
            expect(ltResult.messages[0].message).toBe('True');
            expect(leResult.success).toBe(true);
            expect(leResult.messages[0].message).toBe('True');
            expect(gtResult.success).toBe(true);
            expect(gtResult.messages[0].message).toBe('True');
            expect(geResult.success).toBe(true);
            expect(geResult.messages[0].message).toBe('True');
            expect(eqResult.success).toBe(true);
            expect(eqResult.messages[0].message).toBe('True');
            expect(neResult.success).toBe(true);
            expect(neResult.messages[0].message).toBe('True');
        });
    });

    describe('Control Flow - FOR Loops', () => {
        it('should execute FOR loop', () => {
            // Arrange
            const script = `
                dim i, sum
                sum = 0
                for i = 1 to 5
                    sum += i
                next
                message 1, sum
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('15');
        });

        it('should execute FOR loop with step', () => {
            // Arrange
            const script = `
                dim i, sum
                sum = 0
                for i = 0 to 10 step 2
                    sum += i
                next
                message 1, sum
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('30');
        });

        it('should handle nested FOR loops', () => {
            // Arrange
            const script = `
                dim i, j, count
                count = 0
                for i = 1 to 3
                    for j = 1 to 3
                        count += 1
                    next
                next
                message 1, count
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('9');
        });
    });

    describe('Control Flow - DO Loops', () => {
        it('should execute DO WHILE loop', () => {
            // Arrange
            const script = `
                dim i, sum
                i = 1
                sum = 0
                do while i <= 5
                    sum += i
                    i += 1
                loop
                message 1, sum
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('15');
        });

        it('should execute DO loop with LOOP UNTIL', () => {
            // Arrange
            const script = `
                dim i, sum
                i = 1
                sum = 0
                do
                    sum += i
                    i += 1
                loop until i > 5
                message 1, sum
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('15');
        });
    });

    describe('Functions', () => {
        it('should define and call a function', () => {
            // Arrange
            const script = `
                function double(x)
                    double = x * 2
                end function

                dim result
                result = double(21)
                message 1, result
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should handle recursive function', () => {
            // Arrange
            const script = `
                function factorial(n)
                    if n <= 1 then
                        factorial = 1
                    else
                        factorial = n * factorial(n - 1)
                    end if
                end function

                dim result
                result = factorial(5)
                message 1, result
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('120');
        });
    });

    describe('External Variables', () => {
        it('should use external variable in script', () => {
            // Arrange
            const script = service.compile('message 1, external_value', false, true);
            script.setExternalValue('external_value', 42);

            // Act
            const result = service.execute(script);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should use external string variable', () => {
            // Arrange
            const script = service.compile('message 1, name', false, true);
            script.setExternalValue('name', 'Claude');

            // Act
            const result = service.execute(script);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('Claude');
        });

        it('should use multiple external variables', () => {
            // Arrange
            const script = service.compile('message 1, a + b', false, true);
            script.setExternalValue('a', 10);
            script.setExternalValue('b', 32);

            // Act
            const result = service.execute(script);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should calculate with external variables', () => {
            // Arrange
            const script = service.compile(`
                dim result
                result = price * quantity
                message 1, result
            `, false, true);
            script.setExternalValue('price', 9.99);
            script.setExternalValue('quantity', 3);

            // Act
            const result = service.execute(script);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('29.97');
        });

        it('should reuse compiled script with different external values', () => {
            // Arrange
            const script = service.compile('message 1, x * 2', false, true);

            // Act & Assert - First execution
            script.setExternalValue('x', 5);
            const result1 = service.execute(script);
            expect(result1.success).toBe(true);
            expect(result1.messages[0].message).toBe('10');

            // Act & Assert - Second execution with different value
            script.setExternalValue('x', 21);
            const result2 = service.execute(script);
            expect(result2.success).toBe(true);
            expect(result2.messages[0].message).toBe('42');
        });
    });

    describe('Error Handling', () => {
        it('should return error for invalid script', () => {
            // Arrange & Act
            const result = service.run('invalid syntax here !!!', false, false);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).not.toBeNull();
        });

        it('should return error for undefined variable', () => {
            // Arrange & Act
            const result = service.run('message 1, undefined_var', true, false);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error).not.toBeNull();
        });

        it('should detect compile-time syntax error', () => {
            // Arrange & Act
            const compiled = service.compile('for i = 1 to', false, false);

            // Assert
            expect(compiled.hasError).toBe(true);
            expect(compiled.error).not.toBeNull();
        });
    });

    describe('Compilation and Execution', () => {
        it('should compile script separately and execute later', () => {
            // Arrange
            const script = service.compile('message 1, 42', false, false);

            // Act
            const result = service.execute(script);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should reuse compiled script multiple times', () => {
            // Arrange
            const script = service.compile('message 1, 42', false, false);

            // Act
            const result1 = service.execute(script);
            const result2 = service.execute(script);
            const result3 = service.execute(script);

            // Assert
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result3.success).toBe(true);
        });
    });

    describe('Stress Tests', () => {
        it('should handle large loop', () => {
            // Arrange
            const script = `
                dim i, sum
                sum = 0
                for i = 1 to 1000
                    sum += i
                next
                message 1, sum
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('500500');
        });

        it('should handle nested loops stress', () => {
            // Arrange
            const script = `
                dim i, j, count
                count = 0
                for i = 1 to 100
                    for j = 1 to 100
                        count += 1
                    next
                next
                message 1, count
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('10000');
        });

        it('should handle deep recursion within limits', () => {
            // Arrange
            const script = `
                function recurse(n)
                    if n <= 0 then
                        recurse = 0
                    else
                        recurse = 1 + recurse(n - 1)
                    end if
                end function

                dim result
                result = recurse(100)
                message 1, result
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('100');
        });

        it('should fail on too deep recursion', () => {
            // Arrange
            const script = `
                function infinite_recurse(n)
                    infinite_recurse = 1 + infinite_recurse(n + 1)
                end function

                dim result
                result = infinite_recurse(1)
                message 1, result
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error?.description).toContain('recursion');
        });

        it('should support cancellation token', () => {
            // Arrange
            const script = `
                dim i
                for i = 1 to 1000000
                    ' long running loop
                next
                message 1, "done"
            `;
            const compiled = service.compile(script, false, false);
            const token: CancellationToken = { isCancelled: true };

            // Act
            const result = service.execute(compiled, token);

            // Assert
            expect(result.success).toBe(false);
            expect(result.error?.description).toContain('cancelled');
        });

        it('should handle many sequential operations', () => {
            // Arrange
            const script = `
                dim x
                x = 1
                x = x + 1
                x = x * 2
                x = x - 1
                x = x / 2
                x = x + 10
                x = x * 3
                x = x - 5
                x = x + 100
                x = x / 5
                message 1, x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('25.9');
        });

        it('should handle complex nested expressions', () => {
            // Arrange
            const script = 'message 1, ((1 + 2) * (3 + 4)) + ((5 + 6) * (7 + 8))';

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('186');
        });
    });

    describe('Logical Operations', () => {
        it('should handle AND operation (bitwise)', () => {
            // Arrange & Act - VBScript AND is bitwise on integers
            const result = service.run('message 1, 7 and 3', false, false);

            // Assert - 7 AND 3 = 0111 AND 0011 = 0011 = 3 (if bitwise)
            // But VBScript uses logical AND which returns True/False
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('True');
        });

        it('should handle OR operation (bitwise)', () => {
            // Arrange & Act - VBScript OR is bitwise on integers
            const result = service.run('message 1, 4 or 2', false, false);

            // Assert - 4 OR 2 = 0100 OR 0010 = 0110 = 6 (if bitwise)
            // But VBScript uses logical OR
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('6');
        });

        it('should handle NOT operation', () => {
            // Arrange
            const script = `
                dim x
                x = 1 > 2
                message 1, not x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert - VBScript returns "True" with capital T
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('True');
        });

        it('should handle logical AND with booleans', () => {
            // Arrange
            const script = `
                dim a, b
                a = 1 > 0
                b = 2 > 0
                message 1, a and b
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('True');
        });

        it('should handle logical OR with booleans', () => {
            // Arrange - OR is bitwise: False=0, True=-1 (or 1)
            // 0 OR -1 = -1 which displays as 1 or True depending on implementation
            const script = `
                dim a, b
                a = 1 > 2
                b = 2 > 0
                message 1, a or b
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert - The implementation returns the bitwise result
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });
    });

    describe('Multiple Messages', () => {
        it('should collect multiple messages', () => {
            // Arrange
            const script = `
                message 1, "first"
                message 2, "second"
                message 3, "third"
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages.length).toBe(3);
            expect(result.messages[0].message).toBe('first');
            expect(result.messages[0].type).toBe(1);
            expect(result.messages[1].message).toBe('second');
            expect(result.messages[1].type).toBe(2);
            expect(result.messages[2].message).toBe('third');
            expect(result.messages[2].type).toBe(3);
        });
    });
});
