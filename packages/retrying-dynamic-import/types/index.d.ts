/**
 * 配置选项接口
 * 所有字段都是可选的，会使用默认值填充
 */
export type Options = {
  /**
   * 用户离线时显示的错误消息
   * @default "No internet connection"
   */
  offlineMessage?: string;

  /**
   * 检测到用户离线时的回调函数
   * @default undefined
   */
  offlineCallback?: () => void;

  /**
   * 是否禁用 CSS 重试加载功能
   * @default false
   */
  disableRetryingCSS?: boolean;

  /**
   * 当 `window.navigator.onLine` 为 false 时，用于二次确认网络状态的 URL
   * 有时即使 onLine 为 false，浏览器仍可能连接到网络
   * @default undefined
   */
  checkOnlineUrl?: string;

  /**
   * 每次重试前调用的回调函数
   * @param url 正在重试的模块 URL
   * @param count 当前重试次数（从 1 开始）
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

/**
 * 初始化动态导入重试功能
 * 调用后会在 window 上注册 __retrying_dynamic_loader__ 方法
 */
export default function retryingDynamicImport(options?: Options): void;

/**
 * 匹配动态 import 语句中的模块 URL 的正则表达式
 */
export const MODULE_URL_REGEX: RegExp;

/**
 * 为 URL 添加时间戳参数，用于绕过缓存
 */
export function addTimestamp(baseUrl: string): string;

/**
 * 检测网络是否真正离线
 */
export function isOffline(checkUrl: string): Promise<boolean>;

/**
 * 动态导入模块的包装函数
 */
export function dynamicImport(url: string): Promise<unknown>;

/**
 * 扩展 Window 接口，声明全局加载器方法
 */
declare global {
  interface Window {
    /**
     * 动态导入重试加载器
     * 由 retryingDynamicImport() 初始化后挂载到 window 上
     * 使用泛型保留原始 import 的类型信息
     */
    __retrying_dynamic_loader__?: <T = unknown>(
      originalImport: () => Promise<T>
    ) => Promise<T>;
  }
}
