import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const ACCESS_SECRET = () => process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET!;

const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY = '7d';

export interface AccessPayload {
  userId: string;
  email: string;
}

export interface RefreshPayload {
  userId: string;
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, ACCESS_SECRET(), { expiresIn: ACCESS_EXPIRY });
}

export function signRefreshToken(payload: RefreshPayload): string {
  return jwt.sign(payload, REFRESH_SECRET(), { expiresIn: REFRESH_EXPIRY });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, ACCESS_SECRET()) as AccessPayload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, REFRESH_SECRET()) as RefreshPayload;
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict' as const,
    path: '/',
  };

  const cookieStore = await cookies();
  cookieStore.set('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 });
  cookieStore.set('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}
