import { en } from './translations/en';

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** Same shape as the English dictionary, with every leaf open to any translated text. */
export type Translations = DeepTranslations<typeof en>;

type DeepTranslations<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends PluralForms ? PluralForms : DeepTranslations<T[K]>;
};

/** Every dotted path that ends in a string or a set of plural forms. */
export type TranslationKey = LeafPaths<typeof en>;

type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string | PluralForms ? K : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];
