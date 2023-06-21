When using "dynamic import", we can't get the module again if the import fails. Therefore, I wrote this library to attempt to solve the issue.

### How to use

Add “vite-plugin-retrying-dynamic-import” to Vite configuration.

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

Add “retrying-dynamic-import” to the entry file(main.ts or main.js).

The position is on top of the entry file because I will register a global function to the window(its name is "\_\_retrying_dynamic_loader\_\_ ").

```js
import retryingDynamicImport from "retrying-dynamic-import"

retryingDynamicImport(// your options);
```

Finished.

### About Vite "build.modulePreload" option

If the value of the "build.modulePreload" option is true(the default value is true). You can't use this lib directly because if preload fails, the dynamic import will fail directly.

If it fails when preloading CSS Files, Vite will not retry, and this lib will not retry too because it can't control preloading behaviour.

So, I use the following code to resolve that.

```js
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: false,
    modulePreload: false,
  },
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
