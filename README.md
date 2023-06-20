When using “dynamic import”, if the import fails, we can’t get the module again. Therefore, I wrote this library to attempt to solve the issue.

### How to use

Add “vite-plugin-retrying-dynamic-import” to Vite configuration.

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

Add “retrying-dynamic-import” to the entry file(main.ts or main.js).

The position is on top of the entry file. Because I will register a global function to the window(its name is "**retrying_dynamic_loader** ").

```js
import retryingDynamicImport from "retrying-dynamic-import"

retryingDynamicImport(// your options);
```

Finished.

### About Vite "build.modulePreload" option

If the value of the "build.modulePreload" option is true(the default value is true). you can't use this lib directly, because if preload fails, the dynamic import will fail directly.

I use the following code to resolve that.

```js
 // vite.config.ts
 modulePreload: {
    resolveDependencies: (filename, deps, { hostId, hostType }) => {
      return deps.filter((file: string) => !file.match(/\.js$/));
    }
  },
```

### How it works

1. “import(’a.js’)” fails.
2. I change ‘a.js’ to ‘a.js?t=xxxxxx’ and try again.
3. just that.

### Related issues:

1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804
