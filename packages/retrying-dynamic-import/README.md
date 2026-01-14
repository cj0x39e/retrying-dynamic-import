# retrying-dynamic-import

[![Test](https://github.com/cj0x39e/retrying-dynamic-import/actions/workflows/test.yml/badge.svg)](https://github.com/cj0x39e/retrying-dynamic-import/actions/workflows/test.yml)
[![npm version](https://badge.fury.io/js/retrying-dynamic-import.svg)](https://www.npmjs.com/package/retrying-dynamic-import)

A library to automatically retry failed dynamic imports with configurable retry logic, offline detection, and CSS retry support.

## Features

- 🔄 **Auto Retry** - Automatically retry failed dynamic imports up to configurable max attempts
- 📡 **Offline Detection** - Detect offline status with optional secondary URL check
- 🎨 **CSS Retry** - Optionally retry failed CSS loads
- ⚡ **Request Deduplication** - Concurrent requests for the same module share a single Promise
- 📦 **Module Caching** - Successfully loaded modules are cached
- 🔧 **Configurable** - Customize retry interval, max retries, callbacks, and more

## Installation

```bash
npm install retrying-dynamic-import
# or
pnpm add retrying-dynamic-import
# or
yarn add retrying-dynamic-import
```

## Usage

### Basic Usage

```ts
import retryingDynamicImport from "retrying-dynamic-import";

// Initialize with default options
retryingDynamicImport();

// Now use window.__retrying_dynamic_loader__ to wrap dynamic imports
const module = await window.__retrying_dynamic_loader__(() => import("./MyComponent.js"));
```

### With Options

```ts
import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport({
  maxRetries: 5,           // Maximum retry attempts (default: 3)
  interval: 2000,          // Retry interval in ms (default: 1000)
  offlineMessage: "You are offline",
  offlineCallback: () => {
    console.log("User is offline");
  },
  onRetry: (url, attempt) => {
    console.log(`Retrying ${url}, attempt ${attempt}`);
  },
  checkOnlineUrl: "https://example.com/health",  // Secondary online check URL
  disableRetryingCSS: false,  // Enable CSS retry (default: false)
});
```

### With Vue Router

```ts
import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport();

const routes = [
  {
    path: "/home",
    component: () => window.__retrying_dynamic_loader__(() => import("./Home.vue")),
  },
];
```

### With React Router

```tsx
import retryingDynamicImport from "retrying-dynamic-import";
import { lazy } from "react";

retryingDynamicImport();

const Home = lazy(() => window.__retrying_dynamic_loader__(() => import("./Home")));
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxRetries` | `number` | `3` | Maximum number of retry attempts |
| `interval` | `number` | `1000` | Delay between retries in milliseconds |
| `offlineMessage` | `string` | `"No internet connection"` | Error message when offline |
| `offlineCallback` | `() => void` | `undefined` | Callback when offline is detected |
| `onRetry` | `(url: string, count: number) => void` | `undefined` | Callback before each retry |
| `checkOnlineUrl` | `string` | `undefined` | URL to verify online status when `navigator.onLine` is false |
| `disableRetryingCSS` | `boolean` | `false` | Disable automatic CSS retry |

## How It Works

1. When a dynamic import is requested, the library first checks if the module is cached
2. If not cached, it checks for in-flight requests to deduplicate concurrent calls
3. Before loading, it checks network status (optionally with a secondary URL check)
4. On failure, it retries with a cache-busting timestamp parameter
5. After max retries, it throws an enriched error with context

## License

MIT
