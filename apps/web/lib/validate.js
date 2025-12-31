import { NextResponse } from 'next/server';

/**
 * Build a consistent validation error response from a Zod error.
 * This helper centralises the formatting of validation errors so that
 * all API routes can return the same structure.  The response body
 * contains an errorCode identifying the type of error, a user-friendly
 * message and a map of field errors keyed by field name.  The HTTP
 * status will always be 400 for validation errors.
 *
 * @param {import('zod').ZodError} error
 * @returns {NextResponse}
 */
export function validationErrorResponse(error) {
  const flattened = error.flatten();
  return NextResponse.json(
    {
      errorCode: 'VALIDATION_ERROR',
      message: 'Controlla i campi evidenziati',
      fields: flattened.fieldErrors,
    },
    { status: 400 },
  );
}