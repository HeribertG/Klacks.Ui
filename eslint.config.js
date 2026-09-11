// @ts-check
const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    ignores: ["**/assets/docs/**/*.html"],
  },
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^(slice|split|substring|substr)$/][callee.object.type='CallExpression'][callee.object.callee.property.name='toISOString']",
          message:
            "Deriving a calendar date by truncating toISOString() of a local midnight shifts to the previous day east of UTC (e.g. Switzerland). Use parseCalendarDate/calendarDateKey from calendar-date.helper instead.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1] > Identifier.arguments:first-child[name=/^(?:.*Date|date|birthdate|.*validFrom|.*validUntil)$/]",
          message:
            "new Date(<backend calendar-date field>) is read as UTC and shifts a day west of UTC. Use parseCalendarDate from calendar-date.helper instead.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.length=1] > MemberExpression.arguments:first-child[property.name=/^(?:.*Date|date|birthdate|.*validFrom|.*validUntil)$/]",
          message:
            "new Date(<backend calendar-date field>) is read as UTC and shifts a day west of UTC. Use parseCalendarDate from calendar-date.helper instead.",
        },
      ],
    },
  },
  {
    files: [
      "**/shared/helpers/calendar-date.helper.ts",
      "**/shared/helpers/date.helper.ts",
      "**/*.spec.ts",
      "**/shared/testing/**",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/interactive-supports-focus": "error",
      "@angular-eslint/template/click-events-have-key-events": "error",
      "@angular-eslint/template/alt-text": "error",
      "@angular-eslint/template/label-has-associated-control": "error",
      "@angular-eslint/template/valid-aria": "error",
      "@angular-eslint/template/no-autofocus": "warn",
      "@angular-eslint/template/no-positive-tabindex": "error",
      "@angular-eslint/template/elements-content": "error",
      "@angular-eslint/template/role-has-required-aria": "error",
      "@angular-eslint/template/mouse-events-have-key-events": "error",
      "@angular-eslint/template/table-scope": "warn",
    },
  }
);
