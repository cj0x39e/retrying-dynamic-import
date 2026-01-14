import type { Options } from "../types";
import { retryToLoadCSS } from "./retryingCSS";

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认最大重试次数
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * 默认重试间隔（毫秒）
 */
const DEFAULT_INTERVAL = 1000;

/**
 * 匹配动态 import 语句中的模块 URL
 * 支持单引号和双引号，允许 import 和括号之间有空格
 * 例如: import('hello.js') => 'hello.js'
 *      import ( "hello.js" ) => 'hello.js'
 */
export const MODULE_URL_REGEX = /import\s*\(\s*["']([^"']+)["']\s*\)/;

// ============================================================================
// 状态管理（模块级单例）
// ============================================================================

/**
 * 已加载模块的缓存
 * key: 模块原始 URL（不带时间戳）
 * value: 模块导出内容
 */
const moduleCache: Record<string, unknown> = {};

/**
 * 记录每个模块的重试次数
 * key: 模块 URL
 * value: 当前重试次数
 */
const moduleRetryCount: Record<string, number> = {};

/**
 * 正在加载中的模块 Promise 映射
 * 用于去重并发请求，避免同一模块被多次加载
 * key: 模块 URL
 * value: 加载中的 Promise
 */
const inFlightRequests: Record<string, Promise<unknown>> = {};

/**
 * 默认配置选项
 */
const defaultOptions: Required<
  Pick<Options, "offlineMessage" | "disableRetryingCSS" | "interval" | "maxRetries">
> &
  Omit<Options, "offlineMessage" | "disableRetryingCSS" | "interval" | "maxRetries"> = {
  offlineMessage: "No internet connection",
  disableRetryingCSS: false,
  checkOnlineUrl: undefined,
  onRetry: undefined,
  offlineCallback: undefined,
  interval: DEFAULT_INTERVAL,
  maxRetries: DEFAULT_MAX_RETRIES,
};

/**
 * 当前生效的配置（合并用户配置后的结果）
 * 注意：这是模块级单例，多次调用 retryingDynamicImport 会覆盖之前的配置
 */
const options: typeof defaultOptions = { ...defaultOptions };

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 为 URL 添加时间戳参数，用于绕过缓存
 * @param baseUrl - 原始 URL
 * @returns 添加了时间戳参数的 URL
 */
export const addTimestamp = (baseUrl: string): string => {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}t=${Date.now()}`;
};

/**
 * 通过请求指定 URL 来检测网络是否真正离线
 * 用于二次确认 navigator.onLine 的结果
 *
 * @param checkUrl - 用于检测网络状态的 URL
 * @returns true 表示离线，false 表示在线
 */
export const isOffline = async (checkUrl: string): Promise<boolean> => {
  try {
    await fetch(addTimestamp(checkUrl));
    // 只要有响应就认为在线，不管状态码
    // 这里只是检测网络是否通畅，不关心服务是否正常
    return false;
  } catch {
    // 请求失败（网络错误、DNS 解析失败等）认为是离线
    return true;
  }
};

/**
 * 动态导入模块的包装函数
 * 单独导出以便于测试时 mock
 *
 * @param url - 模块 URL
 * @returns 模块导出内容
 */
export const dynamicImport = (url: string): Promise<unknown> => {
  return import(/* @vite-ignore */ url);
};

/**
 * 从动态 import 函数的字符串表示中提取模块 URL
 *
 * 原理：将函数转换为字符串，然后用正则匹配 import('url') 中的 url
 * 注意：这种方法依赖于打包器输出的函数格式，可能不适用于所有情况
 *
 * @param originalImport - 原始的动态 import 函数
 * @returns 模块 URL，如果无法提取则返回 null
 */
const getRouteComponentUrl = (
  originalImport: () => Promise<unknown>
): string | null => {
  try {
    const fnString = originalImport.toString();
    const match = fnString.match(MODULE_URL_REGEX);
    // 使用可选链和空值合并，避免 match 为 null 时报错
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

/**
 * 创建带有上下文信息的错误对象
 *
 * @param url - 加载失败的模块 URL
 * @param attempts - 总共尝试的次数
 * @param originalError - 原始错误
 * @returns 包含详细信息的错误对象
 */
const createEnrichedError = (
  url: string,
  attempts: number,
  originalError: unknown
): Error => {
  const message = `Failed to dynamically import "${url}" after ${attempts} attempts`;
  const error = new Error(message, { cause: originalError });
  return error;
};

// ============================================================================
// 核心逻辑
// ============================================================================

/**
 * 处理离线状态
 * 调用离线回调（如果配置了）并返回离线错误
 *
 * @returns 包含离线错误消息的 Error 对象
 */
const handleOfflineState = (): Error => {
  options.offlineCallback?.();
  return new Error(options.offlineMessage);
};

/**
 * 获取模块，支持自动重试
 *
 * 特性：
 * 1. 已加载的模块直接从缓存返回
 * 2. 正在加载的模块返回同一个 Promise（去重并发请求）
 * 3. 失败后自动重试，最多重试 maxRetries 次
 * 4. 重试时添加时间戳参数绕过缓存
 *
 * @param url - 模块 URL
 * @returns 模块导出内容
 */
const fetchModule = (url: string): Promise<unknown> => {
  // 1. 检查缓存，已加载的模块直接返回
  if (moduleCache[url]) {
    return Promise.resolve(moduleCache[url]);
  }

  // 2. 检查是否有正在进行的请求，避免重复加载
  if (inFlightRequests[url]) {
    return inFlightRequests[url];
  }

  // 3. 创建新的加载请求
  const loadPromise = new Promise<unknown>((resolve, reject) => {
    /**
     * 重试加载逻辑
     * 使用递归实现，每次失败后延迟一段时间再重试
     */
    const retry = async (
      res: (value: unknown) => void,
      rej: (reason?: unknown) => void
    ): Promise<void> => {
      const online = window.navigator.onLine;

      // 检查网络状态
      if (!online) {
        // navigator.onLine 显示离线，但可能不准确
        // 如果配置了 checkOnlineUrl，进行二次确认
        if (options.checkOnlineUrl) {
          const offline = await isOffline(options.checkOnlineUrl);
          if (offline) {
            rej(handleOfflineState());
            return;
          }
          // 二次确认显示在线，继续加载
        } else {
          // 没有配置二次确认 URL，直接认为离线
          rej(handleOfflineState());
          return;
        }
      }

      // 确定要请求的 URL
      // 首次请求使用原始 URL，重试时添加时间戳绕过缓存
      const isRetrying = moduleRetryCount[url] !== undefined;
      const importUrl = isRetrying ? addTimestamp(url) : url;

      dynamicImport(importUrl)
        .then((mod) => {
          // 加载成功，缓存模块并清理重试计数
          moduleCache[url] = mod;
          delete moduleRetryCount[url];
          res(mod);
        })
        .catch((err) => {
          // 加载失败，更新重试计数
          moduleRetryCount[url] = (moduleRetryCount[url] ?? 0) + 1;
          const currentAttempt = moduleRetryCount[url];

          if (currentAttempt <= options.maxRetries) {
            // 还有重试机会，等待后重试
            // 延迟重试是为了应对服务器临时故障（如重启、过载等）
            setTimeout(() => {
              // 调用重试回调（如果配置了）
              options.onRetry?.(url, currentAttempt);
              retry(res, rej);
            }, options.interval);
          } else {
            // 超过最大重试次数，清理状态并拒绝
            const totalAttempts = currentAttempt;
            delete moduleRetryCount[url];
            rej(createEnrichedError(url, totalAttempts, err));
          }
        });
    };

    retry(resolve, reject);
  });

  // 记录正在进行的请求
  inFlightRequests[url] = loadPromise;

  // 请求完成后（无论成功还是失败）清理 inFlightRequests
  // 使用 .then + .catch 而不是 .finally，避免创建未处理的 rejection
  loadPromise
    .then(() => {
      delete inFlightRequests[url];
    })
    .catch(() => {
      delete inFlightRequests[url];
    });

  return loadPromise;
};

/**
 * 合并用户配置到全局配置
 *
 * @param userOptions - 用户提供的配置选项
 */
const mergeOptions = (userOptions: Options): void => {
  Object.assign(options, userOptions);
};

// ============================================================================
// 导出 API
// ============================================================================

/**
 * 初始化动态导入重试功能
 *
 * 调用此函数后，会在 window 上注册 __retrying_dynamic_loader__ 方法，
 * 用于包装动态 import 调用，提供自动重试能力。
 *
 * @example
 * ```ts
 * // 初始化
 * retryingDynamicImport({
 *   maxRetries: 5,
 *   interval: 2000,
 *   onRetry: (url, count) => console.log(`Retrying ${url}, attempt ${count}`)
 * });
 *
 * // 使用（通常由路由器或打包器插件自动调用）
 * window.__retrying_dynamic_loader__(() => import('./MyComponent.js'));
 * ```
 *
 * @param userOptions - 可选的配置选项
 */
const retryingDynamicImport = (userOptions: Options = {}): void => {
  mergeOptions(userOptions);

  window.__retrying_dynamic_loader__ = <T = unknown>(
    originalImport: () => Promise<T>
  ): Promise<T> => {
    // 如果启用了 CSS 重试，先处理 CSS
    if (options.disableRetryingCSS !== true) {
      retryToLoadCSS();
    }

    return new Promise<T>((resolve, reject) => {
      const url = getRouteComponentUrl(originalImport);

      if (url === null) {
        // 无法提取 URL，回退到原始 import（不带重试功能）
        originalImport().then(resolve).catch(reject);
      } else {
        // 使用带重试功能的 fetchModule
        fetchModule(url).then((mod) => resolve(mod as T)).catch(reject);
      }
    });
  };
};

export default retryingDynamicImport;
