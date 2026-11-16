import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Lang, parseLang, translate, TranslationParams } from '../utils/i18n';

const STORAGE_KEY = 'language';

/** Holds the chosen language (Dutch by default) and translates texts. */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private current: Lang = parseLang(I18nService.readStoredLang());
  readonly changes$ = new Subject<Lang>();

  get lang(): Lang {
    return this.current;
  }

  setLang(lang: Lang): void {
    if (lang === this.current) {
      return;
    }
    this.current = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage can be unavailable (private mode); the choice then lasts for this page only.
    }
    document.documentElement.lang = lang;
    this.changes$.next(lang);
  }

  t(key: string, params?: TranslationParams): string {
    return translate(this.current, key, params);
  }

  private static readStoredLang(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
