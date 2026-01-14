English | [中文](https://github.com/cj0x39e/retrying-dynamic-import/blob/main/README.zh-CN.md)

[![Test](https://github.com/cj0x39e/retrying-dynamic-import/actions/workflows/test.yml/badge.svg)](https://github.com/cj0x39e/retrying-dynamic-import/actions/workflows/test.yml)
[![npm version](https://badge.fury.io/js/retrying-dynamic-import.svg)](https://www.npmjs.com/package/retrying-dynamic-import)

If a "dynamic module" fails to load, the browser will not load it again forever. This library attempts to solve the issue.

## What does it resolve?

1. If `import('a.js')` has failed, the lib will load it again when the load process is called. The default behavior will fail immediately.

2. If the user can't access the internet, the library will fail immediately, but this is not the same as the browser's default behavior, it doesn't do the load process.

3. The lib will attempt to reload any failed CSS files.

4. **Concurrent requests for the same module are deduplicated** - multiple calls share a single Promise.

5. **Successfully loaded modules are cached** - no redundant network requests.

> If a.js depends on b.js and b.js is a 'static import module', the load of a.js will fail if b.js has failed to load. Unfortunately, this can't be fixed.

## How to use

Add `vite-plugin-retrying-dynamic-import` to Vite configuration.

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

Add `retrying-dynamic-import` to the entry file (main.ts or main.js).

Put it at the top of the entry file, because the lib will register a global function to the window object (the name is `__retrying_dynamic_loader__`).

```js
import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport({
  // your options
});
```

Finished.

## Options

### Options for `retrying-dynamic-import`

```ts
type Options = {
  /**
   * Message to report when the user is offline
   * @default "No internet connection"
   */
  offlineMessage?: string;

  /**
   * Callback to call when the user is offline
   * @default undefined
   */
  offlineCallback?: () => void;

  /**
   * Whether to disable CSS retry when loading dynamic modules
   * @default false
   */
  disableRetryingCSS?: boolean;

  /**
   * When `window.navigator.onLine` is false, request this URL to detect
   * if the network is actually offline. Sometimes, even if the value is false,
   * the browser can still connect to the internet.
   * @default undefined
   */
  checkOnlineUrl?: string;

  /**
   * Callback called before each retry attempt
   * @param url - The module URL being retried
   * @param count - Current retry attempt number
   * @default undefined
   */
  onRetry?: (url: string, count: number) => void;

  /**
   * Retry interval in milliseconds
   * @default 1000
   */
  interval?: number;

  /**
   * Maximum number of retry attempts
   * @default 3
   */
  maxRetries?: number;
};
```

### Options for `vite-plugin-retrying-dynamic-import`

No options.

## About Vite `build.modulePreload` option

If the code is similar to below:

```js
// main.js
import("a.js");

// a.js
import b from "b.js";
```

Vite will preload b.js before dynamic importing a.js. If b.js has failed, a.js will fail too.

We can't control how to load b.js because it's a static import. So, we need to turn off preloading js in Vite.

```js
// vite.config.ts
export default defineConfig({
  build: {
    modulePreload: {
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        return deps.filter((file: string) => !file.match(/\.js$/));
      },
    },
  },
});
```

## About retrying CSS files

If it has failed when preloading CSS files, Vite will not retry. The lib will reload all the failed CSS files before loading each dynamic import module.

If the modulePreload option is false, similar to the following:

```js
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: false,
    modulePreload: false,
  },
});
```

You need to set `disableRetryingCSS` to true, which will not do retrying loadings CSS files.

```js
// main.js
import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport({
  disableRetryingCSS: true,
});
```

## How it works

1. `import('a.js')` fails.
2. The lib changes `a.js` to `a.js?t=xxxxxx` and tries again.
3. Repeats up to `maxRetries` times (default: 3) with `interval` ms delay (default: 1000).
4. If still failing after max retries, throws an enriched error with context.
5. Concurrent requests for the same module share the same Promise (deduplication).
6. Successfully loaded modules are cached and returned immediately on subsequent calls.

## Related issues

1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804

## License

MIT
