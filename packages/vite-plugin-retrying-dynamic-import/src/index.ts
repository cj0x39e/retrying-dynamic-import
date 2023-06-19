import type { Plugin } from "vite";

const retryingModuleId = "retrying-dynamic-import";

export default function retryingDynamicImport(): Plugin {
  return {
    name: "retrying-dynamic-import",
    enforce: "pre",
    apply: "build",
    renderDynamicImport({ moduleId }) {
      if (moduleId === retryingModuleId) {
        return null;
      }

      return {
        left: "__retrying_dynamic_loader__(() => import(",
        right: "))",
      };
    },
  };
}
