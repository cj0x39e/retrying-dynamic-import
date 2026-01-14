import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Mock 设置
// ============================================================================

// 模拟 retryToLoadCSS 函数
vi.mock("./retryingCSS", () => ({
  retryToLoadCSS: vi.fn(),
}));

// ============================================================================
// 测试工具函数
// ============================================================================

/**
 * 创建一个模拟的动态 import 函数
 * @param url - 模块 URL
 */
const createMockImport = (url: string) => {
  const fn = vi.fn(() => Promise.resolve({ default: "module" }));
  fn.toString = () => `() => import("${url}")`;
  return fn;
};

// ============================================================================
// 测试用例
// ============================================================================

describe("retryingDynamicImport", () => {
  beforeEach(async () => {
    // 重置模块以清除缓存状态
    vi.resetModules();
    vi.useFakeTimers();

    // 重置 window.__retrying_dynamic_loader__
    delete window.__retrying_dynamic_loader__;

    // 默认设置为在线状态
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("初始化", () => {
    it("应该在 window 上注册 __retrying_dynamic_loader__", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport();
      expect(window.__retrying_dynamic_loader__).toBeDefined();
      expect(typeof window.__retrying_dynamic_loader__).toBe("function");
    });

    it("应该支持自定义配置", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      const onRetry = vi.fn();
      retryingDynamicImport({
        maxRetries: 5,
        interval: 2000,
        onRetry,
      });
      expect(window.__retrying_dynamic_loader__).toBeDefined();
    });
  });

  describe("MODULE_URL_REGEX（导出的正则）", () => {
    it("应该正确匹配双引号 import", async () => {
      const { MODULE_URL_REGEX } = await import("./index");
      const match = '() => import("/test.js")'.match(MODULE_URL_REGEX);
      expect(match?.[1]).toBe("/test.js");
    });

    it("应该正确匹配单引号 import", async () => {
      const { MODULE_URL_REGEX } = await import("./index");
      const match = "() => import('/test.js')".match(MODULE_URL_REGEX);
      expect(match?.[1]).toBe("/test.js");
    });

    it("应该正确匹配带空格的 import", async () => {
      const { MODULE_URL_REGEX } = await import("./index");
      const match = "() => import( '/spaces.js' )".match(MODULE_URL_REGEX);
      expect(match?.[1]).toBe("/spaces.js");
    });

    it("应该正确匹配带查询参数的 URL", async () => {
      const { MODULE_URL_REGEX } = await import("./index");
      const match = '() => import("/module.js?v=123")'.match(MODULE_URL_REGEX);
      expect(match?.[1]).toBe("/module.js?v=123");
    });

    it("应该正确匹配 import 和括号之间有空格", async () => {
      const { MODULE_URL_REGEX } = await import("./index");
      const match = '() => import ("/test.js")'.match(MODULE_URL_REGEX);
      expect(match?.[1]).toBe("/test.js");
    });
  });

  describe("addTimestamp（导出的函数）", () => {
    it("应该正确处理不带查询参数的 URL", async () => {
      const { addTimestamp } = await import("./index");
      vi.spyOn(Date, "now").mockReturnValue(12345);
      expect(addTimestamp("/test.js")).toBe("/test.js?t=12345");
    });

    it("应该正确处理带查询参数的 URL", async () => {
      const { addTimestamp } = await import("./index");
      vi.spyOn(Date, "now").mockReturnValue(12345);
      expect(addTimestamp("/test.js?v=1")).toBe("/test.js?v=1&t=12345");
    });
  });

  describe("isOffline（导出的函数）", () => {
    it("fetch 成功时应该返回 false（在线），不管状态码", async () => {
      const { isOffline } = await import("./index");
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 })
      );

      const result = await isOffline("https://example.com/health");
      expect(result).toBe(false);
    });

    it("fetch 返回非 2xx 状态码时也应该返回 false（在线）", async () => {
      const { isOffline } = await import("./index");
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("error", { status: 500 })
      );

      // 只要有响应就认为在线，不关心状态码
      const result = await isOffline("https://example.com/health");
      expect(result).toBe(false);
    });

    it("fetch 失败时应该返回 true（离线）", async () => {
      const { isOffline } = await import("./index");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await isOffline("https://example.com/health");
      expect(result).toBe(true);
    });
  });

  describe("模块加载回退", () => {
    it("无法解析 URL 时应该回退到原始 import", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport();

      const mockModule = { default: "fallback" };
      const mockImport = vi.fn(() => Promise.resolve(mockModule));
      mockImport.toString = () => "function() { /* invalid */ }";

      const result = await window.__retrying_dynamic_loader__!(mockImport);
      expect(result).toEqual(mockModule);
      expect(mockImport).toHaveBeenCalledTimes(1);
    });

    it("无法解析 URL 且原始 import 失败时应该传递错误", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport();

      const mockImport = vi.fn(() => Promise.reject(new Error("Original error")));
      mockImport.toString = () => "invalid format";

      await expect(
        window.__retrying_dynamic_loader__!(mockImport)
      ).rejects.toThrow("Original error");
    });
  });

  describe("离线处理", () => {
    it("离线时应该立即拒绝", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport({ offlineMessage: "网络已断开" });

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

      const mockImport = createMockImport("/offline.js");

      const promise = window.__retrying_dynamic_loader__!(mockImport);
      await expect(promise).rejects.toThrow("网络已断开");
    });

    it("离线时应该调用 offlineCallback", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      const offlineCallback = vi.fn();
      retryingDynamicImport({ offlineCallback });

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

      const mockImport = createMockImport("/offline-cb.js");

      const promise = window.__retrying_dynamic_loader__!(mockImport);
      await expect(promise).rejects.toThrow();

      expect(offlineCallback).toHaveBeenCalledTimes(1);
    });

    it("配置 checkOnlineUrl 且二次确认失败时应该认为离线", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValue(new Error("Network error"));

      retryingDynamicImport({
        checkOnlineUrl: "https://example.com/health",
        offlineMessage: "确认离线",
      });

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

      const mockImport = createMockImport("/confirm-offline.js");

      const promise = window.__retrying_dynamic_loader__!(mockImport);
      await expect(promise).rejects.toThrow("确认离线");

      fetchSpy.mockRestore();
    });

    it("配置 checkOnlineUrl 且二次确认成功时应该继续加载（回退路径）", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("ok", { status: 200 })
      );

      retryingDynamicImport({ checkOnlineUrl: "https://example.com/health" });

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

      // 使用无法解析 URL 的 mock 走回退路径
      const mockModule = { default: "online-check" };
      const mockImport = vi.fn(() => Promise.resolve(mockModule));
      mockImport.toString = () => "invalid";

      const result = await window.__retrying_dynamic_loader__!(mockImport);

      expect(result).toEqual(mockModule);

      fetchSpy.mockRestore();
    });
  });

  describe("CSS 重试", () => {
    it("默认应该启用 CSS 重试", async () => {
      const { retryToLoadCSS } = await import("./retryingCSS");
      const { default: retryingDynamicImport } = await import("./index");

      retryingDynamicImport();

      const mockImport = vi.fn(() => Promise.resolve({ default: "test" }));
      mockImport.toString = () => "invalid";

      await window.__retrying_dynamic_loader__!(mockImport);

      expect(retryToLoadCSS).toHaveBeenCalled();
    });

    it("disableRetryingCSS 为 true 时应该禁用 CSS 重试", async () => {
      const { retryToLoadCSS } = await import("./retryingCSS");
      vi.mocked(retryToLoadCSS).mockClear();
      const { default: retryingDynamicImport } = await import("./index");

      retryingDynamicImport({ disableRetryingCSS: true });

      const mockImport = vi.fn(() => Promise.resolve({ default: "test" }));
      mockImport.toString = () => "invalid";

      await window.__retrying_dynamic_loader__!(mockImport);

      expect(retryToLoadCSS).not.toHaveBeenCalled();
    });
  });

  describe("配置合并", () => {
    it("应该使用默认配置", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport();

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      const mockImport = createMockImport("/default.js");

      const promise = window.__retrying_dynamic_loader__!(mockImport);
      await expect(promise).rejects.toThrow("No internet connection");
    });

    it("用户配置应该覆盖默认配置", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport({ offlineMessage: "自定义离线消息" });

      vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
      const mockImport = createMockImport("/custom.js");

      const promise = window.__retrying_dynamic_loader__!(mockImport);
      await expect(promise).rejects.toThrow("自定义离线消息");
    });
  });

  describe("错误处理", () => {
    it("getRouteComponentUrl 解析失败时应该返回 null 并走回退路径", async () => {
      const { default: retryingDynamicImport } = await import("./index");
      retryingDynamicImport();

      const mockImport = vi.fn(() => Promise.resolve({ ok: true }));
      Object.defineProperty(mockImport, "toString", {
        get() {
          throw new Error("Cannot convert to string");
        },
      });

      const result = await window.__retrying_dynamic_loader__!(mockImport);
      expect(result).toEqual({ ok: true });
    });
  });

  describe("导出的函数", () => {
    it("dynamicImport 应该被导出", async () => {
      const { dynamicImport } = await import("./index");
      expect(typeof dynamicImport).toBe("function");
    });

    it("MODULE_URL_REGEX 应该被导出", async () => {
      const { MODULE_URL_REGEX } = await import("./index");
      expect(MODULE_URL_REGEX).toBeInstanceOf(RegExp);
    });

    it("addTimestamp 应该被导出", async () => {
      const { addTimestamp } = await import("./index");
      expect(typeof addTimestamp).toBe("function");
    });

    it("isOffline 应该被导出", async () => {
      const { isOffline } = await import("./index");
      expect(typeof isOffline).toBe("function");
    });
  });
});
