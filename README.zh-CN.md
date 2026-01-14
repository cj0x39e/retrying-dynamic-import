[English](https://github.com/cj0x39e/retrying-dynamic-import/blob/main/README.md) | 中文

[![Test](https://github.com/cj0x39e/retrying-dynamic-import/actions/workflows/test.yml/badge.svg)](https://github.com/cj0x39e/retrying-dynamic-import/actions/workflows/test.yml)
[![npm version](https://badge.fury.io/js/retrying-dynamic-import.svg)](https://www.npmjs.com/package/retrying-dynamic-import)

在使用 "dynamic import" 时，如果其导入失败，浏览器目前是没有重试机制的，写这个库尝试解决这个问题。

## 解决了什么问题

1. 如果动态导入模块 A 失败，在下次触发动态加载时，会重试，而不是直接失败。

2. 用户没有网络时，该库内部直接失败，不去加载动态导入模块。

3. 会检测加载失败的 CSS，并尝试重新加载。

4. **并发请求去重** - 同一模块的多个并发请求会共享同一个 Promise。

5. **模块缓存** - 成功加载的模块会被缓存，避免重复网络请求。

> 但是对于打包后的动态模块 A，如果其代码还有静态导入 B，如果静态导入 B 失败，那么 A 会失败。这种场景目前没有解决。

## 如何使用

添加 `vite-plugin-retrying-dynamic-import` 到 Vite 的配置中：

```js
import retryingDynamicImport from "vite-plugin-retrying-dynamic-import";

export default defineConfig({
  plugins: [retryingDynamicImport()],
});
```

在入口文件添加 `retrying-dynamic-import`（main.ts 或者是 main.js）。

建议放在文件的最顶部，因为需要在 window 上注入一个全局方法（方法名是 `__retrying_dynamic_loader__`）。

```js
import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport({
  // 你的配置项
});
```

这样就可以了。

## 配置项

### `retrying-dynamic-import` 的配置项

```ts
type Options = {
  /**
   * 用户离线时抛出的错误消息
   * @default "No internet connection"
   */
  offlineMessage?: string;

  /**
   * 用户离线时的回调函数
   * @default undefined
   */
  offlineCallback?: () => void;

  /**
   * 是否禁用自动重新加载已失败的 CSS 文件
   * @default false
   */
  disableRetryingCSS?: boolean;

  /**
   * 当 `window.navigator.onLine` 为 false 时，请求该 URL 来二次确认网络状态。
   * 有时即使 onLine 为 false，浏览器仍可能连接到网络。
   * @default undefined
   */
  checkOnlineUrl?: string;

  /**
   * 每次重试前调用的回调函数
   * @param url - 正在重试的模块 URL
   * @param count - 当前重试次数
   * @default undefined
   */
  onRetry?: (url: string, count: number) => void;

  /**
   * 重试间隔时间（毫秒）
   * @default 1000
   */
  interval?: number;

  /**
   * 最大重试次数
   * @default 3
   */
  maxRetries?: number;
};
```

### `vite-plugin-retrying-dynamic-import` 的配置项

目前还没有。

## 关于 Vite `build.modulePreload` 配置项

如果动态导入的代码依赖关系如下：

```js
// main.js
import("a.js");

// a.js
import b from "b.js";
```

默认情况下，Vite 打包完成后，在运行时，在加载 a.js 之前会预加载 b.js，如果 b.js 加载失败，那么 a.js 也会加载失败。

b.js 的导入是没有办法控制的，因为它是静态导入。所以为了避免预加载失败而导致动态加载的模块加载失败的情况，就需要把 js 的预加载禁用：

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

当然，如果在加载 a.js 过程中 b.js 失败了，a.js 的加载仍然会失败，这种情况目前无法控制。如上所说，因为它是一个静态导入。

## 关于重试 CSS 文件

如果 CSS 加载失败了，Vite 不会重试，这个库默认会在每次执行动态加载 js 之前尝试重新加载失败的 CSS 文件。

如果 Vite 配置 CSS 是不拆分的，类似下面的配置，因为只有一个样式文件，所以不存在 CSS 的预加载：

```js
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: false,
    modulePreload: false,
  },
});
```

这种情况需要把 `disableRetryingCSS` 设置为 true，避免继续执行自动重试 CSS 的逻辑：

```js
// main.js
import retryingDynamicImport from "retrying-dynamic-import";

retryingDynamicImport({
  disableRetryingCSS: true,
});
```

## 工作原理

1. `import('a.js')` 这个动态导入如果失败了。
2. 会把请求地址 `a.js` 变为 `a.js?t=xxxxxx`，然后进行重试。
3. 最多重试 `maxRetries` 次（默认 3 次），每次间隔 `interval` 毫秒（默认 1000ms）。
4. 如果达到最大重试次数仍然失败，抛出包含上下文信息的错误。
5. 同一模块的并发请求会共享同一个 Promise（请求去重）。
6. 成功加载的模块会被缓存，后续调用直接返回缓存。

另外当用户没有网络时会直接抛出错误，避免明知会失败的动态加载发生。

## 相关 Issues

1. https://github.com/vuejs/router/issues/1371
2. https://github.com/vuejs/router/issues/1333
3. https://github.com/vitejs/vite/issues/11804

## License

MIT
