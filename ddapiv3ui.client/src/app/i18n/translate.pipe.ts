import { Pipe, PipeTransform } from '@angular/core';
import { TranslationParams } from '../utils/i18n';
import { I18nService } from './i18n.service';

/**
 * Translates a text key: {{ 'action.get' | t }} or {{ 'status.inResult' | t: { count: n } }}.
 * Not pure, so the text changes as soon as the user switches language.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  constructor(private i18n: I18nService) { }

  transform(key: string, params?: TranslationParams): string {
    return this.i18n.t(key, params);
  }
}
