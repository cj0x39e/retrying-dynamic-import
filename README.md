English | [中文](https://github.com/cj0x39e/retrying-dynamic-import/blob/main/README.zh-CN.md)

If a “dynamic module” fails to load, the browser will not load it again forever. so, I wrote this lib to attempt to solve the issue.

### What does it resolve?

1. If  'import('a.js')' has failed, the lib will load it again as the load process is called. The default behavior will fail immediately.

2. If the user can’t access the internet, the library will fail immediately, but this is not the same as the browser’s default behavior, it doesn’t do the load process.

3. The lib will attempt to reload any failed  CSS files.

If a.js dependencies b.js and b.js is a 'static import module', the load of a.js will fail if b.js has failed to load. Unfortunately, it can't be fixed.

### How to use

Add “vite-plugin-retrying-dynamic-import” to Vite configuration.

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

Add “retrying-dynamic-import” to the entry file(main.ts or main.js).

Put it at the top of the entry file, because the lib will register a global function to the window object.(the name is "\_\_retrying_dynamic_loader\_\_ ")

```js
import retryingDynamicImport from "retrying-dynamic-import"

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
   * is offline. Sometimes, even if the value is false, the browser can still connect
   * to the internet.
   */
  checkOnlineUrl?: string;
};
```

#### Options for the "vite-plugin-retrying-dynamic-import".

No options.

### About Vite "build.modulePreload" option

If the code  is similar below:

```js
// main.js
import("a.js");

// a.js
import b from "b.js";
```

Vite will preload the b.js before dynamic importing the a.js. If the b.js has failed, the a.js will fail too.

We can't control how to load b.js because it’s a static import. So, we need to turn off preloading js in Vite.

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

### About retrying CSS files

If it has failed when preloading CSS Files, Vite will not retry. The lib will reload all the failed CSS files before loading each dynamic import module.

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

You need to set the disableRetryingCSS to true that will not do retrying loadings CSS files.

```js
// main.js
import retryingDynamicImport from "retrying-dynamic-import.";

retryingDynamicImport({
  disableRetryingCSS: true,
});
```

### How it works

1. “import(’a.js’)” fails.
2. The lib change ‘a.js’ to ‘a.js?t=xxxxxx’ and try again.
3. just that.

### Related issues:

1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804
