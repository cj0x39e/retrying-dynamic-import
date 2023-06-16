When using “dynamic import”, if the import fails, we can’t get the module again. Therefore, I wrote this library to attempt to solve the issue.

#### How to use

Add “rollup-plugin-retrying-dynamic-import” to the Rollup or Vite configuration.

```js
import retryingDynamicImport from "rollup-plugin-retrying-dynamic-import"
{
   ...
  plugins: [
   ...
   retryingDynamicImport()
  ]
  ...
}
```
Add “retrying-dynamic-import” to the entry file(main.js/main.js…).

```js
import retryingDynamicImport from "retrying-dynamic-import"

retryingDynamicImport(// your options);
```

Finished.

#### How it works

1. “import(’a.js’)” fails.
2. I change ‘a.js’ to ‘a.js?t=xxxxxx’ and try again.
3. just that.

#### Related issues:
1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804
