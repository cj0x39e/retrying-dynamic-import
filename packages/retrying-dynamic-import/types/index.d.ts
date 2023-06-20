export type Options = {
  /**
   * Message to report when user is offline
   * @type {string}
   * @default "No internet connection"
   */
  offlineMessage?: string;

  /**
   * Callback to call when user is offline.
   * @default undefined
   */
  offlineCallback?: () => void;
};

export default function retryingDynamicImport(options?: Options): void;

declare global {
  interface Window {
    __retrying_dynamic_loader__: retryingDynamicImport;
  }
}
