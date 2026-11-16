/**
 * Turns error responses from DD-API services into a short explanation and a hint on
 * what to do. The explanation refers to texts in i18n.ts (`<key>.title`, `<key>.hint`),
 * so it can be shown in Dutch or English. The original message is kept for reference.
 */

export interface ErrorExplanation {
  /** Text key, for example 'error.missingFilter'; the texts are `<key>.title` and `<key>.hint`. */
  key: string;
  /** Field path that the explanation is about (for example 'Parameter/Organisation'), if any. */
  field: string | null;
  /** Allowed range for range errors (for example '1 - 10000'), if any. */
  range: string | null;
  /** Original message from the service, if any. */
  details: string | null;
  /** RequestId from the message, useful when contacting the data provider. */
  requestId: string | null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function extractRequestId(message: string): string | null {
  const match = /\(RequestId:\s*([^)]+)\)/.exec(message);
  return match ? match[1].trim() : null;
}

function stripRequestId(message: string): string {
  return message.replace(/\s*\(RequestId:[^)]*\)/, '').trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
}

/**
 * Reads the error from a response. Handles an OData error body ({ error: { Code, Message } })
 * and an Angular HttpErrorResponse ({ error: { status, message, error: <body> } }), whose
 * body can again contain an OData-style error.
 */
function readError(response: unknown): { code: string, message: string, status: number | null } | null {
  const error = asRecord(asRecord(response)?.['error']);
  if (!error) {
    return null;
  }
  const rawStatus = error['Status'] ?? error['status'];
  const status = typeof rawStatus === 'number' ? rawStatus : null;
  let code = text(error['Code'] ?? error['code']);
  let message = text(error['Message'] ?? error['message']);

  const nested = asRecord(asRecord(error['error'])?.['error']);
  if (nested) {
    code = text(nested['Code'] ?? nested['code']) || code;
    message = text(nested['Message'] ?? nested['message']) || message;
  }
  return { code, message, status };
}

function isError(response: unknown): boolean {
  return response === null || response === undefined || response === '' || readError(response) !== null;
}

/**
 * Explains a response after a request. Without an API key, any error is explained as a
 * missing key, because that is almost always the cause. Returns null when the response is a normal result.
 * An empty response (null, undefined or '') is explained as a likely key problem, because
 * the query builder's server passes an empty body when the service answers 401.
 */
export function explainResponse(response: unknown, hasApiKey: boolean = true): ErrorExplanation | null {
  const none = { field: null, range: null, details: null, requestId: null };
  if (!hasApiKey && isError(response)) {
    // Without a key, services answer with anything from an empty body to a server error.
    const error = readError(response);
    const message = error?.message ?? '';
    return { ...none, key: 'error.noKey', details: message ? stripRequestId(message) : null, requestId: extractRequestId(message) };
  }
  if (response === null || response === undefined || response === '') {
    return { ...none, key: 'error.noResponse' };
  }

  const error = readError(response);
  if (!error) {
    return null;
  }

  const { code, message, status } = error;
  const base = { ...none, details: message ? stripRequestId(message) : (code || null), requestId: extractRequestId(message) };

  if (status === 0) {
    return { ...base, key: 'error.unreachable' };
  }
  if (code === 'UrlNotAllowed') {
    return { ...base, key: 'error.urlNotAllowed' };
  }
  if (code === 'MissingFilter') {
    return { ...base, key: 'error.missingFilter' };
  }
  const required = /Property '([^']+)' is required but not found/i.exec(message);
  if (required) {
    return { ...base, key: 'error.requiredField', field: required[1] };
  }
  const unknown = /Unknown property '([^']+)'/i.exec(message);
  if (unknown) {
    return { ...base, key: 'error.unknownField', field: unknown[1] };
  }
  if (/Unexpected token/i.test(message) || /Filter error/i.test(message)) {
    return { ...base, key: 'error.unreadableFilter' };
  }
  if (/^\d+\s*-\s*\d+$/.test(code)) {
    return { ...base, key: 'error.range', range: code };
  }
  if (/Database error/i.test(message)) {
    return { ...base, key: 'error.database' };
  }
  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|api key/i.test(`${code} ${message}`)) {
    return { ...base, key: 'error.noAccess' };
  }
  return { ...base, key: 'error.general' };
}
