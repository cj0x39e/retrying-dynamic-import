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

  /**
   * Called before retrying a module
   * @param url retrying module url
   * @param count the number of retrying
   * @returns
   */
  onRetry?: (url: string, count: number) => void;

  /**
   * Retry interval in milliseconds, the default value is 1000ms
   */
  interval?: number;
};

export default function retryingDynamicImport(options?: Options): void;

declare global {
  interface Window {
    __retrying_dynamic_loader__: retryingDynamicImport;
  }
}
