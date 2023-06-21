import type { Options } from "../types";
import { retryToLoadCSS } from "./retryingCSS";

// match a module url
// eg: import('hello.js') => 'hello.js'
const uriOrRelativePathRegex = /import\(["']([^)]+)['"]\)/;

/**
 * Records a module if it's already loaded.
 * key: module url
 * value: module
 */
const moduleCache: Record<string, any> = {};

/**
 * Records the number of retrying times of a module.
 * key: module url
 * value: number
 */
const moduleRetryCount: Record<string, number> = {};

const options: Options = {
  offlineMessage: "No internet connection",
  disableRetryingCSS: false,
};

const fetchModule = async (url: string): Promise<any> => {
  if (moduleCache[url]) {
    return moduleCache[url];
  }

  return new Promise((resolve, reject) => {
    const retry = (
      res: (value: unknown) => void,
      rej: (reason?: any) => void
    ) => {
      const online = window.navigator.onLine;

      if (!online) {
        if (options.offlineCallback) {
          options.offlineCallback();
        }
        rej(new Error(options.offlineMessage));

        return;
      }

      const urlWithTimestamp = url.includes("?")
        ? url + "&t=" + Date.now()
        : url + "?t=" + Date.now();

      // if the module is not loaded, use the original url
      const importUrl =
        moduleRetryCount[url] == undefined ? url : urlWithTimestamp;

      import(/* @vite-ignore */ importUrl)
        .then((mod) => {
          moduleCache[url] = mod;

          if (moduleRetryCount[url]) {
            moduleRetryCount[url] = 1;
          }

          res(mod);
        })
        .catch((err) => {
          if (!moduleRetryCount[url]) {
            moduleRetryCount[url] = 1;
          } else {
            moduleRetryCount[url]++;
          }

          if (moduleRetryCount[url] <= 3) {
            retry(res, rej);
          } else {
            moduleRetryCount[url] = 1;
            rej(err);
          }
        });
    };

    retry(resolve, reject);
  });
};

const getRouteComponentUrl = (originalImport: () => Promise<any>) => {
  let url: string;

  try {
    const fnString = originalImport.toString();
    url = fnString.match(uriOrRelativePathRegex)[1];
  } catch (e) {
    return null;
  }

  return url;
};

const mergeOptions = (userOptions: Options) => {
  Object.assign(options, userOptions);
};

const retryingDynamicImport = (options: Options) => {
  mergeOptions(options);

  window.__retrying_dynamic_loader__ = (originalImport: () => Promise<any>) => {
    if (options.disableRetryingCSS != true) {
      retryToLoadCSS();
    }

    return new Promise((resolve, reject) => {
      const url = getRouteComponentUrl(originalImport);

      if (url == null) {
        originalImport().then(resolve).catch(reject);
      } else {
        fetchModule(url).then(resolve).catch(reject);
      }
    });
  };
};

export default retryingDynamicImport;
