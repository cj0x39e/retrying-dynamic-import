const uriOrRelativePathRegex = /import\(["']([^)]+)['"]\)/;

const moduleCache: Record<string, any> = {};
const moduleRetryCount: Record<string, number> = {};

const fetchModule = async (url: string): Promise<any> => {
  if (moduleCache[url]) {
    return moduleCache[url];
  }

  return new Promise((resolve, reject) => {
    const retry = (
      res: (value: unknown) => void,
      rej: (reason?: any) => void
    ) => {
      const urlWithTime = url.includes("?")
        ? url + "&t=" + Date.now()
        : url + "?t=" + Date.now();
      const online = window.navigator.onLine;

      if (!online) {
        rej(new Error("请检查网络状态"));
        return;
      }

      const importUrl = moduleRetryCount[url] == undefined ? url : urlWithTime;

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

export const retryingDynamicImport = () => {
  window.__retrying_dynamic_loader__ = (originalImport: () => Promise<any>) => {
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
