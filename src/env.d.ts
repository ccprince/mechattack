/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * `git describe` output naming the build, shown in the footer (ADR 0006). Set by the `build`
   * script; absent in `npm run dev` and in tests.
   */
  readonly VITE_BUILD?: string;
}
