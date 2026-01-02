import { ScriptService } from './script.service';
import { CancellationToken } from './script-execution-context';

describe('ScriptService', () => {
    let service: ScriptService;

    beforeEach(() => {
        service = new ScriptService();
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
            const result = service.run('output 1, 2 + 3', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('5');
        });

        it('should calculate subtraction', () => {
            // Arrange & Act
            const result = service.run('output 1, 10 - 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('6');
        });

        it('should calculate multiplication', () => {
            // Arrange & Act
            const result = service.run('output 1, 6 * 7', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should calculate division', () => {
            // Arrange & Act
            const result = service.run('output 1, 10/9', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1.1111111111111112');
        });

        it('should calculate integer division', () => {
            // Arrange & Act
            const result = service.run('output 1, 10\\9', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should calculate mod', () => {
            // Arrange & Act
            const result = service.run('output 1, 10 mod 3', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should calculate power', () => {
            // Arrange & Act
            const result = service.run('output 1, 10 ^ 3', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1000');
        });

        it('should handle negative multiplication', () => {
            // Arrange & Act
            const result = service.run('output 1, -1 * -1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should handle positive times negative', () => {
            // Arrange & Act
            const result = service.run('output 1, 1 * -1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('-1');
        });

        it('should handle zero multiplication', () => {
            // Arrange & Act
            const result = service.run('output 1, 0 * 1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('0');
        });

        it('should handle zero division', () => {
            // Arrange & Act
            const result = service.run('output 1, 0 / 1', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('0');
        });

        it('should handle division by zero', () => {
            // Arrange & Act
            const result = service.run('output 1, 1 / 0', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('Infinity');
        });

        it('should handle parentheses', () => {
            // Arrange & Act
            const result = service.run('output 1, (2 + 3) * 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('20');
        });

        it('should respect operator precedence', () => {
            // Arrange & Act
            const result = service.run('output 1, 2 + 3 * 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('14');
        });

        it('should handle complex expression', () => {
            // Arrange & Act
            const result = service.run('output 1, (10 + 5) * 2 - 8 / 4', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('28');
        });
    });

    describe('Trigonometric Functions', () => {
        it('should calculate sin', () => {
            // Arrange & Act
            const result = service.run('output 1, sin(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.sin(1)));
        });

        it('should calculate cos', () => {
            // Arrange & Act
            const result = service.run('output 1, cos(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.cos(1)));
        });

        it('should calculate tan', () => {
            // Arrange & Act
            const result = service.run('output 1, tan(1)', false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe(String(Math.tan(1)));
        });

        it('should calculate atan', () => {
            // Arrange & Act
            const result = service.run('output 1, atan(1)', false, false);

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
                output 1, x
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
                output 1, x
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
                output 1, x
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
                output 1, x
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
                output 1, x
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
                output 1, c
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
                output 1, s
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
                output 1, c
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
                    output 1, "greater"
                else
                    output 1, "smaller"
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
                    output 1, "greater"
                else
                    output 1, "smaller"
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
                        output 1, "big"
                    else
                        output 1, "medium"
                    end if
                else
                    output 1, "small"
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
            const ltResult = service.run('output 1, 3 < 5', false, false);
            const leResult = service.run('output 1, 5 <= 5', false, false);
            const gtResult = service.run('output 1, 7 > 5', false, false);
            const geResult = service.run('output 1, 5 >= 5', false, false);
            const eqResult = service.run('output 1, 5 = 5', false, false);
            const neResult = service.run('output 1, 5 <> 3', false, false);

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
                output 1, sum
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
                output 1, sum
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
                output 1, count
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
                output 1, sum
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
                output 1, sum
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('15');
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
            const result = service.run('output 1, undefined_var', true, false);

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
            const script = service.compile('output 1, 42', false, false);

            // Act
            const result = service.execute(script);

            // Assert
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('42');
        });

        it('should reuse compiled script multiple times', () => {
            // Arrange
            const script = service.compile('output 1, 42', false, false);

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

    describe('Logical Operations', () => {
        it('should handle AND operation (bitwise)', () => {
            // Arrange & Act - VBA AND is bitwise on integers
            const result = service.run('output 1, 7 and 3', false, false);

            // Assert - 7 AND 3 = 0111 AND 0011 = 0011 = 3
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('3');
        });

        it('should handle AndAlso with integers (logical)', () => {
            // Arrange & Act - AndAlso is short-circuit logical
            const result = service.run('output 1, 7 andalso 3', false, false);

            // Assert - Both non-zero → True
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('True');
        });

        it('should handle OR operation (bitwise)', () => {
            // Arrange & Act - VBA OR is bitwise on integers
            const result = service.run('output 1, 4 or 2', false, false);

            // Assert - 4 OR 2 = 0100 OR 0010 = 0110 = 6
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('6');
        });

        it('should handle OrElse with integers (logical)', () => {
            // Arrange & Act - OrElse is short-circuit logical
            const result = service.run('output 1, 4 orelse 2', false, false);

            // Assert - First non-zero → True
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('True');
        });

        it('should handle NOT operation', () => {
            // Arrange
            const script = `
                dim x
                x = 1 > 2
                output 1, not x
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert - VBScript returns "True" with capital T
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('True');
        });

        it('should handle bitwise AND with booleans', () => {
            // Arrange - AND is bitwise: True(=1) AND True(=1) = 1
            const script = `
                dim a, b
                a = 1 > 0
                b = 2 > 0
                output 1, a and b
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert - Bitwise AND of True(=1) AND True(=1) = 1
            expect(result.success).toBe(true);
            expect(result.messages[0].message).toBe('1');
        });

        it('should handle AndAlso with booleans (logical)', () => {
            // Arrange - AndAlso returns True/False
            const script = `
                dim a, b
                a = 1 > 0
                b = 2 > 0
                output 1, a andalso b
            `;

            // Act
            const result = service.run(script, false, false);

            // Assert - Both true → True
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
                output 1, a or b
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
                output 1, "first"
                output 2, "second"
                output 3, "third"
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
