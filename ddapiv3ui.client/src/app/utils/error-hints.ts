/**
 * Turns error responses from DD-API services into a short explanation and a hint on
 * what to do. The original message is kept for reference.
 */

import { fieldDisplayName } from './field-labels';

export interface ErrorExplanation {
  title: string;
  hint: string;
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

/** Reads the error object from an OData error response ({ error: { Code, Message } }). */
function readError(response: unknown): { code: string, message: string, status: number | null } | null {
  if (response === null || typeof response !== 'object') {
    return null;
  }
  const error = (response as Record<string, unknown>)['error'];
  if (error === null || typeof error !== 'object') {
    return null;
  }
  const fields = error as Record<string, unknown>;
  const code = text(fields['Code'] ?? fields['code']);
  const message = text(fields['Message'] ?? fields['message']);
  const rawStatus = fields['Status'] ?? fields['status'];
  const status = typeof rawStatus === 'number' ? rawStatus : null;
  return { code, message, status };
}

/**
 * Explains a response after a request. Returns null when the response is a normal result.
 * An empty response (null, undefined or '') is explained as a likely key problem, because
 * the query builder's server passes an empty body when the service answers 401.
 */
export function explainResponse(response: unknown): ErrorExplanation | null {
  if (response === null || response === undefined || response === '') {
    return {
      title: 'No response from the service',
      hint: 'The service returned nothing. This usually means the API key is missing or not valid for this service. Check the API key field.',
      details: null,
      requestId: null
    };
  }

  const error = readError(response);
  if (!error) {
    return null;
  }

  const { code, message, status } = error;
  const details = message ? stripRequestId(message) : (code || null);
  const requestId = extractRequestId(message);
  const base = { details, requestId };

  if (status === 0) {
    return { ...base, title: 'The service could not be reached', hint: 'Check the base URL and your network connection.' };
  }

  if (code === 'MissingFilter') {
    return { ...base, title: 'A filter is required', hint: 'This service does not return data without a filter. Add at least one filter.' };
  }

  const required = /Property '([^']+)' is required but not found/i.exec(message);
  if (required) {
    const field = required[1];
    return {
      ...base,
      title: `A filter on ${fieldDisplayName(field)} is required`,
      hint: `This service only answers when the filter includes ${field}. Add a filter on this field (for example with "eq" and a code from the suggestions).`
    };
  }

  const unknown = /Unknown property '([^']+)'/i.exec(message);
  if (unknown) {
    return { ...base, title: `Unknown field: ${unknown[1]}`, hint: 'This service does not know this field. Choose a field from the list.' };
  }

  if (/Unexpected token/i.test(message) || /Filter error/i.test(message)) {
    return {
      ...base,
      title: 'The filter could not be read',
      hint: 'Check the filter values: text between quotes, dates and times as 2025-01-01T00:00:00Z, and lists separated by commas.'
    };
  }

  if (/^\d+\s*-\s*\d+$/.test(code)) {
    return { ...base, title: 'A parameter is outside the allowed range', hint: `The allowed range is ${code}. Check $top (the number of records per page).` };
  }

  if (/Database error/i.test(message)) {
    return {
      ...base,
      title: 'The service could not process the request',
      hint: 'If the query is correct, the API key may have been revoked or may not have access to this data. Try another API key, or contact the data provider and mention the RequestId.'
    };
  }

  if (status === 401 || status === 403 || /unauthori[sz]ed|forbidden|api key/i.test(`${code} ${message}`)) {
    return { ...base, title: 'No access', hint: 'The API key is not valid or has no access to this data. Check the API key field.' };
  }

  return { ...base, title: 'The service returned an error', hint: 'See the details below.' };
}
