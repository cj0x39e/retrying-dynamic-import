import type { Plugin } from "rollup";

const retryingModuleId = "retrying-dynamic-import";

export default function retryingDynamicImport(): Plugin {
  return {
    name: "retrying-dynamic-import",
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
