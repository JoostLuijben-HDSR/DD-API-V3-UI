import { explainResponse } from './error-hints';
import { MESSAGES } from './i18n';

function odataError(code: string, message: string, status: number = 400) {
  return { error: { Code: code, Message: message, Status: status } };
}

describe('explainResponse', () => {
  it('returns null for a normal result', () => {
    expect(explainResponse({ value: [] })).toBeNull();
  });

  it('explains an empty response as a key problem', () => {
    for (const empty of [null, undefined, '']) {
      expect(explainResponse(empty)?.key).toBe('error.noResponse');
    }
  });

  it('explains a missing filter and keeps the message and RequestId', () => {
    const explanation = explainResponse(odataError('MissingFilter', 'Service requires $filter (RequestId: 0HN:1)'));
    expect(explanation?.key).toBe('error.missingFilter');
    expect(explanation?.requestId).toBe('0HN:1');
    expect(explanation?.details).toBe('Service requires $filter');
  });

  it('names the required field', () => {
    const explanation = explainResponse(odataError('InvalidFilter',
      "Invalid filter expression: Property 'Parameter/Organisation' is required but not found in filter expression. (RequestId: 0HN:5)"));
    expect(explanation?.key).toBe('error.requiredField');
    expect(explanation?.field).toBe('Parameter/Organisation');
  });

  it('explains an unknown field', () => {
    const explanation = explainResponse(odataError('InvalidFilter', "Invalid filter expression: Unknown property 'Foo'. (RequestId: x)"));
    expect(explanation?.key).toBe('error.unknownField');
    expect(explanation?.field).toBe('Foo');
  });

  it('explains a filter that cannot be parsed, such as a date without seconds', () => {
    expect(explainResponse(odataError('InvalidFilter', "Filter error: Unexpected token found: 'T00'. (RequestId: x)"))?.key)
      .toBe('error.unreadableFilter');
  });

  it('explains a parameter range error', () => {
    const explanation = explainResponse(odataError('1 - 10000', 'Parameter error (RequestId: x)'));
    expect(explanation?.key).toBe('error.range');
    expect(explanation?.range).toBe('1 - 10000');
  });

  it('explains a database error as a possible key problem', () => {
    const explanation = explainResponse(odataError('ValidationError', 'Database error occurred while processing the request. (RequestId: 0HN:8)'));
    expect(explanation?.key).toBe('error.database');
    expect(explanation?.requestId).toBe('0HN:8');
  });

  it('explains access errors', () => {
    expect(explainResponse(odataError('Unauthorized', 'No access', 401))?.key).toBe('error.noAccess');
  });

  it('explains an unreachable service (Angular HttpErrorResponse with status 0)', () => {
    expect(explainResponse({ error: { status: 0, message: 'Http failure response' } })?.key).toBe('error.unreachable');
  });

  it('reads the body of an Angular HttpErrorResponse, such as UrlNotAllowed from the server', () => {
    const httpError = {
      error: {
        status: 400,
        message: 'Http failure response for /ddapi: 400 Bad Request',
        error: { error: { code: 'UrlNotAllowed', message: 'This server only forwards requests to the configured base URLs.' } }
      }
    };
    const explanation = explainResponse(httpError);
    expect(explanation?.key).toBe('error.urlNotAllowed');
    expect(explanation?.details).toBe('This server only forwards requests to the configured base URLs.');
  });

  it('falls back to a general message', () => {
    const explanation = explainResponse(odataError('Other', 'Something else'));
    expect(explanation?.key).toBe('error.general');
    expect(explanation?.details).toBe('Something else');
  });

  it('only uses keys that have a title and a hint in both languages', () => {
    const keys = ['error.noResponse', 'error.unreachable', 'error.urlNotAllowed', 'error.missingFilter', 'error.requiredField',
      'error.unknownField', 'error.unreadableFilter', 'error.range', 'error.database', 'error.noAccess', 'error.general'];
    const missing = keys.flatMap(key => ['title', 'hint'].flatMap(part =>
      (['nl', 'en'] as const).filter(lang => !MESSAGES[lang][`${key}.${part}`]).map(lang => `${lang}:${key}.${part}`)));
    expect(missing).toEqual([]);
  });
});
