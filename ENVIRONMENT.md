# Environment Configuration Guide

This project now uses explicit environment configuration files for better maintainability.

## Environment Files

### 📁 `src/environments/`
- **`environment.ts`** - Default/fallback configuration
- **`environment.dev.ts`** - Development environment 
- **`environment.prod.ts`** - Production environment

## Build Commands

### Development
```bash
# Uses environment.dev.ts
ng serve --configuration=development
ng serve --configuration=dev  # alias
ng build --configuration=development
```

### Production
```bash
# Uses environment.prod.ts
ng serve --configuration=production
ng build --configuration=production
ng build  # production is default
```

## Environment Properties

### Common Properties
```typescript
export const environment = {
  production: boolean,
  baseUrl: string,
  _baseUrl?: string,  // legacy support
  
  // Feature flags
  enableDebugMode: boolean,
  enableMockData: boolean,
  enableConsoleLogging: boolean,
  enableAngularDevTools: boolean,
  
  // Configuration
  logLevel: 'debug' | 'info' | 'warn' | 'error',
  apiTimeout: number  // milliseconds
};
```

### Environment-Specific Values

| Property | Development | Production | Default |
|----------|-------------|------------|---------|
| `production` | `false` | `true` | `false` |
| `baseUrl` | `https://localhost:5001/api/v1/backend/` | `http://157.180.42.127:5000/api/v1/backend/` | localhost |
| `enableDebugMode` | `true` | `false` | `false` |
| `logLevel` | `'debug'` | `'error'` | `'info'` |
| `apiTimeout` | `30000` | `10000` | `15000` |
| `enableConsoleLogging` | `true` | `false` | `false` |
| `enableAngularDevTools` | `true` | `false` | `false` |

## Angular.json Configuration

File replacements are configured in `angular.json`:

```json
{
  "configurations": {
    "production": {
      "fileReplacements": [{
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.prod.ts"
      }]
    },
    "development": {
      "fileReplacements": [{
        "replace": "src/environments/environment.ts", 
        "with": "src/environments/environment.dev.ts"
      }]
    }
  }
}
```

## Usage in Code

```typescript
import { environment } from '../environments/environment';

// API calls
const apiUrl = environment.baseUrl + 'endpoint';

// Feature flags
if (environment.enableDebugMode) {
  console.log('Debug mode enabled');
}

// Conditional imports
if (environment.enableAngularDevTools && !environment.production) {
  import('@angular/devtools').then(devtools => {
    // Enable Angular DevTools
  });
}
```

## Best Practices

1. **Never commit sensitive data** (API keys, passwords) to environment files
2. **Use feature flags** for conditional functionality
3. **Keep development timeouts longer** than production for debugging
4. **Disable debug features** in production for performance
5. **Use consistent naming** across all environment files

## Migration Notes

- The original `environment.ts` now serves as a fallback configuration
- `environment.dev.ts` contains explicit development settings
- `environment.prod.ts` has been enhanced with additional configuration options
- All environments now have consistent property structure