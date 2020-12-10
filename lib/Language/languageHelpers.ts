import i18next from "i18next";

/**
 * Takes a given string and translates it if it exists, otherwise return
 */
export function useTranslationIfExists(keyOrString: string) {
  return i18next.exists(keyOrString) ? i18next.t(keyOrString) : keyOrString;
}
