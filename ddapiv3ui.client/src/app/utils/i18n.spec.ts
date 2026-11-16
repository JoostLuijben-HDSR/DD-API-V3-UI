import { LANGS, MESSAGES, parseLang, registerMessages, translate } from './i18n';

describe('i18n messages', () => {
  it('has every text in both languages', () => {
    const nl = Object.keys(MESSAGES.nl).sort();
    const en = Object.keys(MESSAGES.en).sort();
    expect(nl.filter(key => !en.includes(key))).toEqual([]);
    expect(en.filter(key => !nl.includes(key))).toEqual([]);
  });

  it('uses the same placeholders in both languages', () => {
    const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(',');
    const different = Object.keys(MESSAGES.en)
      .filter(key => placeholders(MESSAGES.en[key]) !== placeholders(MESSAGES.nl[key] ?? ''));
    expect(different).toEqual([]);
  });

  it('has no empty texts', () => {
    for (const lang of LANGS) {
      expect(Object.keys(MESSAGES[lang]).filter(key => MESSAGES[lang][key].trim() === '')).toEqual([]);
    }
  });
});

describe('translate', () => {
  it('returns the text in the chosen language', () => {
    expect(translate('nl', 'action.get')).toBe('OPHALEN');
    expect(translate('en', 'action.get')).toBe('GET');
  });

  it('fills in placeholders and formats numbers per language', () => {
    expect(translate('nl', 'status.inResult', { count: 12791 })).toBe('12.791 records in het resultaat');
    expect(translate('en', 'status.inResult', { count: 12791 })).toBe('12,791 records in result');
  });

  it('leaves empty placeholders empty', () => {
    expect(translate('en', 'error.unknownField.title', { field: null })).toBe('Unknown field: ');
  });

  it('falls back to the key for unknown texts', () => {
    expect(translate('nl', 'does.not.exist')).toBe('does.not.exist');
  });

  it('accepts extra texts', () => {
    registerMessages({ nl: { 'test.extra': 'Extra' }, en: { 'test.extra': 'Extra EN' } });
    expect(translate('nl', 'test.extra')).toBe('Extra');
    expect(translate('en', 'test.extra')).toBe('Extra EN');
  });
});

describe('parseLang', () => {
  it('defaults to Dutch', () => {
    expect(parseLang(null)).toBe('nl');
    expect(parseLang('fr')).toBe('nl');
    expect(parseLang('en')).toBe('en');
  });
});
