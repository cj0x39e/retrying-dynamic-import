## 0.0.15

- Add `maxRetries` option to configure maximum retry attempts
- Deduplicate concurrent requests for the same module
- Improve type safety: replace `any` with `unknown`
- Fix retry counter reset logic on success
- Improve URL parsing regex to support whitespace in import statements
- Add enriched error messages with context on final failure
- Refactor code with better modularity and comments
- Add unit tests with vitest
- Add GitHub Actions CI workflow

## 0.0.14

- Add random parameters to the offline-check URL to avoid cache

## 0.0.13

- Add the option "interval" to adjust the waiting time before retrying
- Add the option "onRetry" for logging some information before retrying

## 0.0.12

- Waiting for 1s before retrying

## 0.0.11

- Add the 'checkOnlineUrl' option

## 0.0.10

- Fix the error that the code has an error when users do not configure options.

## 0.0.9

- Don't retry to load a CSS file when it is loading.

## 0.0.8

- preserve "@vite-ignore"

## 0.0.7

- It is possible retrying the CSS file.
- add "disableRetryingCSS" option.

## 0.0.6

- fix wrong dependencies

## 0.0.5

- add "offlineMessage" option
- add "offlineCallback" option
