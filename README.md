English | [中文](https://github.com/cj0x39e/retrying-dynamic-import/blob/main/README.zh-CN.md)

When using "dynamic import", we can't get the module again if the import fails. Therefore, I wrote this library to attempt to solve the issue.

### What does it resolve?

1. If the code 'import('a.js')' fails when loaded. When loading it again, this lib will retry. The default behaviour will fail again directly.

2. If the user does not have internet access, it will fail immediately and will not proceed to execute the import function.

3. This library will attempt to reload any CSS files that have failed to load.

If a.js dependencies b.js and b.js is a 'static import module', the loading of a.js will fail if b.js fails to load. Unfortunately, it cannot be fixed.

### How to use

To add “vite-plugin-retrying-dynamic-import” to Vite configuration.

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

To add “retrying-dynamic-import” to the entry file(main.ts or main.js).

You need to place the position at the top of the entry file in order to register a global function to the window.(the name is "\_\_retrying_dynamic_loader\_\_ ")

```js
import retryingDynamicImport from "retrying-dynamic-import."

retryingDynamicImport(// your options);
```

Finished.

### Options

#### Options for the "retrying-dynamic-import".

```ts
export type Options = {
  /**
   * Message to report when the user is offline
   * @type {string}
   * @default "No internet connection"
   */
  offlineMessage?: string;

  /**
   * Callback to call when the user is offline.
   * @default undefined
   */
  offlineCallback?: () => void;

  /**
   * Whether to retry CSS when loads dynamic modules
   * @default false
   */
  disableRetryingCSS?: boolean;

  /**
   * When the value of 'window.navigator.onLine' is false, request the URL to detect if the network
   * is actually offline. Sometimes, even when the value is false, the browser can still connect
   * to the internet.
   */
  checkOnlineUrl?: string;
};
```

#### Options for the "vite-plugin-retrying-dynamic-import".

There are currently no options.

### About Vite "build.modulePreload" option

If the code of dynamic import is similar below:

```js
// main.js
import("a.js");

// a.js
import b from "b.js";
```

Vite will preload the b.js before dynamic importing the a.js. If the b.js load fails, the a.js will be failed too.

We can't control how to load b.js because that is a static import. So, We need to turn off preloading js in Vite.

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

If it fails when preloading CSS Files, Vite will not retry. This lib will reload all the loading failed CSS files before loading each dynamic import module.

If the modulePreload option is false, similar to the following code:

```js
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: false,
    modulePreload: false,
  },
});
```

You need to configure the disableRetryingCSS to true that will not do retrying loadings CSS files.

```js
// main.js
import retryingDynamicImport from "retrying-dynamic-import.";

retryingDynamicImport({
  disableRetryingCSS: true,
});
```

### How it works

1. “import(’a.js’)” fails.
2. I change ‘a.js’ to ‘a.js?t=xxxxxx’ and try again.
3. just that.

### Related issues:

1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804
