在使用 "dynamic import" 时，如果其导入失败，浏览器目前是没有重试机制的，写这个库尝试解决这个问题。

### 解决了什么问题

1. 如果动态导入模块 A 失败，在下次触发动态加载时，会重试，而不是直接失败。
2. 用户没有网络时，该库内部直接失败，不去加载动态导入模块。
3. 会检测加载失败的 CSS ，并尝试重新加载。

但是对于打包后的动态模块 A，如果其代码还有静态导入 B，如果静态导入 B 失败，那么 A 会失败。这种场景目前没有解决。

### 如何使用

添加 “vite-plugin-retrying-dynamic-import” 到 vite 的配置中

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

在入口文件添加 “retrying-dynamic-import” (main.ts 或者是 main.js)

建议放在文件的最顶部，因为需要在 window 上注入一个全局方法（方法名是 "\_\_retrying_dynamic_loader\_\_ "）

```js
import retryingDynamicImport from "retrying-dynamic-import.";

retryingDynamicImport();
```

这样就可以了。

### 配置项

#### "retrying-dynamic-import" 的配置项

```ts
export type Options = {
  /**
   * 用户离线时抛出的错误消息
   * @type {string}
   * @default "No internet connection"
   */
  offlineMessage?: string;

  /**
   * 用户离线时的回调函数
   * @default undefined
   */
  offlineCallback?: () => void;

  /**
   * 是否禁用自动重新加载已失败的CSS文件，默认为 false
   * @default false
   */
  disableRetryingCSS?: boolean;
};
```

#### "vite-plugin-retrying-dynamic-import" 的配置项

目前还没有。

### 关于 Vite "build.modulePreload" 配置项

如果动态导入的代码依赖关系如下：

```js
// main.js
import("a.js");

// a.js
import b from "b.js";
```

默认情况下，Vite 打包完成后，在运行时，在加载 a.js 之前会预加载 b.js，如果 b.js 加载失败，那么 a.js 也会加载失败。

b.js 的导入是没有办法控制的（或许有我不知道），因为它是静态导入。所以为了避免预加载失败而导致动态加载的模块加载失败的情况，
就需要把 js 的预加载禁用。代码示例如下：

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

当然，如果在加载 a.js 过程中, b.js 失败了，a.js 的加载仍然会失败，这种情况目前无法控制。如上所说，因为它是一个静态导入。

如果 CSS 加载失败了，Vite 不会重试，这个库默认会在每次执行动态加载 js 之前尝试重新加载失败的 CSS 文件。

如果 vite 配置 CSS 是不拆分的，类似下面的配置，因为只有一个样式文件，所以不存在 CSS 的预加载。

```js
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: false,
    modulePreload: false,
  },
});
```

这种情况需要把 disableRetryingCSS 设置为 true, 避免继续执行自动重试 CSS 的逻辑。

```js
// main.js
import retryingDynamicImport from "retrying-dynamic-import.";

retryingDynamicImport({
  disableRetryingCSS: true,
});
```

### 工作原理

1. “import(’a.js’)” 这个动态导入如果失败了。
2. 会把请求地址 ‘a.js’ 变为 ‘a.js?t=xxxxxx’ ，然后进行重试.
3. 就这么简单。

另外当用户没有网络时会直接抛出错误，避免明知会失败的动态加载发生。

### Related issues:

1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804
