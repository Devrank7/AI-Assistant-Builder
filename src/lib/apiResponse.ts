import { NextResponse } from 'next/server';

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

export function successResponse<T>(data?: T, message?: string, status = 200) {
  const body: ApiSuccess<T> = { success: true };
  if (data !== undefined) body.data = data;
  if (message) body.message = message;
  return NextResponse.json(body, { status });
}

export function errorResponse(error: string, status = 400, code?: string) {
  const body: ApiError = { success: false, error };
  if (code) body.code = code;
  return NextResponse.json(body, { status });
}

export const Errors = {
  unauthorized: (msg = 'Unauthorized') => errorResponse(msg, 401, 'UNAUTHORIZED'),
  forbidden: (msg = 'Forbidden') => errorResponse(msg, 403, 'FORBIDDEN'),
  notFound: (msg = 'Not found') => errorResponse(msg, 404, 'NOT_FOUND'),
  badRequest: (msg = 'Bad request') => errorResponse(msg, 400, 'BAD_REQUEST'),
  tooManyRequests: (msg = 'Too many requests') => errorResponse(msg, 429, 'RATE_LIMITED'),
  internal: (msg = 'Internal server error') => errorResponse(msg, 500, 'INTERNAL_ERROR'),
};
