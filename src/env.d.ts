/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The short commit SHA the build came from, shown in the footer. Set by the `build` script; absent
   * in `npm run dev` and in tests. There are no released version numbers yet (#49).
   */
  readonly VITE_COMMIT_SHA?: string;
}
