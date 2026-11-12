import { explainResponse } from './error-hints';

function odataError(code: string, message: string, status: number = 400) {
  return { error: { Code: code, Message: message, Status: status } };
}

describe('explainResponse', () => {
  it('returns null for a normal result', () => {
    expect(explainResponse({ value: [] })).toBeNull();
  });

  it('explains an empty response as a key problem', () => {
    for (const empty of [null, undefined, '']) {
      const explanation = explainResponse(empty);
      expect(explanation?.title).toBe('No response from the service');
      expect(explanation?.hint).toContain('API key');
    }
  });

  it('explains a missing filter', () => {
    const explanation = explainResponse(odataError('MissingFilter', 'Service requires $filter (RequestId: 0HN:1)'));
    expect(explanation?.title).toBe('A filter is required');
    expect(explanation?.requestId).toBe('0HN:1');
    expect(explanation?.details).toBe('Service requires $filter');
  });

  it('names the required field with its Dutch name', () => {
    const explanation = explainResponse(odataError('InvalidFilter',
      "Invalid filter expression: Property 'Parameter/Organisation' is required but not found in filter expression. (RequestId: 0HN:5)"));
    expect(explanation?.title).toBe('A filter on Organisatie (waterbeheerder) (Parameter/Organisation) is required');
    expect(explanation?.hint).toContain('Parameter/Organisation');
  });

  it('explains an unknown field', () => {
    const explanation = explainResponse(odataError('InvalidFilter', "Invalid filter expression: Unknown property 'Foo'. (RequestId: x)"));
    expect(explanation?.title).toBe('Unknown field: Foo');
  });

  it('explains a filter that cannot be parsed, such as a date without seconds', () => {
    const explanation = explainResponse(odataError('InvalidFilter', "Filter error: Unexpected token found: 'T00'. (RequestId: x)"));
    expect(explanation?.title).toBe('The filter could not be read');
    expect(explanation?.hint).toContain('2025-01-01T00:00:00Z');
  });

  it('explains a parameter range error', () => {
    const explanation = explainResponse(odataError('1 - 10000', 'Parameter error (RequestId: x)'));
    expect(explanation?.title).toBe('A parameter is outside the allowed range');
    expect(explanation?.hint).toContain('1 - 10000');
  });

  it('explains a database error as a possible key problem', () => {
    const explanation = explainResponse(odataError('ValidationError', 'Database error occurred while processing the request. (RequestId: 0HN:8)'));
    expect(explanation?.title).toBe('The service could not process the request');
    expect(explanation?.hint).toContain('revoked');
    expect(explanation?.requestId).toBe('0HN:8');
  });

  it('explains access errors', () => {
    expect(explainResponse(odataError('Unauthorized', 'No access', 401))?.title).toBe('No access');
  });

  it('explains an unreachable service (Angular HttpErrorResponse with status 0)', () => {
    expect(explainResponse({ error: { status: 0, message: 'Http failure response' } })?.title).toBe('The service could not be reached');
  });

  it('falls back to a general message', () => {
    const explanation = explainResponse(odataError('Other', 'Something else'));
    expect(explanation?.title).toBe('The service returned an error');
    expect(explanation?.details).toBe('Something else');
  });
});
