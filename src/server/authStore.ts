import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AuthUser, SecondaryAccount } from '../types/sportsbook.ts';

export interface StoredUserRecord {
  username: string;
  role: 'admin' | 'cambista';
  cambistaId?: string;
  cambistaName?: string;
  active?: boolean;
  salt: string;
  hash: string;
  createdAt: string;
}

interface AuthStoreData {
  users: StoredUserRecord[];
}

export interface SessionPayload {
  jti: string;
  username: string;
  role: 'admin' | 'cambista';
  cambistaId?: string;
  cambistaName?: string;
  exp: number;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_FILE_PATH = path.resolve(DATA_DIR, 'auth-users.json');

// Session signing secret held in server memory when SESSION_SECRET env var is unset
const SESSION_SECRET = process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const revokedTokenIds = new Set<string>();
const failedLoginTracker = new Map<string, { count: number; resetAt: number }>();

const MAX_FAILED_ATTEMPTS = 10;
const LOCK_WINDOW_MS = 15 * 60 * 1000;

function ensureDataFilePath(): string {
  if (!AUTH_FILE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid auth storage path');
  }
  return AUTH_FILE_PATH;
}

function readStoredUsers(): StoredUserRecord[] {
  const filePath = ensureDataFilePath();
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AuthStoreData>;
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch {
    return [];
  }
}

function writeStoredUsers(users: StoredUserRecord[]): void {
  const filePath = ensureDataFilePath();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ users }, null, 2), { mode: 0o600 });
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { salt: string; hash: string } {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyScryptPassword(password: string, salt: string, expectedHex: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function safeEqualText(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function isEnvAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD?.trim());
}

export function needsInitialSetup(): boolean {
  if (isEnvAdminConfigured()) return false;
  return !readStoredUsers().some((u) => u.role === 'admin');
}

export function bootstrapInitialAdmin(
  username: string,
  password: string
): { ok: true; user: AuthUser } | { ok: false; error: string; status: number } {
  if (!needsInitialSetup()) {
    return { ok: false, error: 'O acesso administrativo já foi configurado no servidor.', status: 409 };
  }
  const cleanUser = username.trim();
  if (cleanUser.length < 3 || cleanUser.length > 40) {
    return { ok: false, error: 'O usuário deve ter entre 3 e 40 caracteres.', status: 400 };
  }
  if (password.length < 6 || password.length > 128) {
    return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.', status: 400 };
  }

  const { salt, hash } = hashPassword(password);
  const existing = readStoredUsers();
  const record: StoredUserRecord = {
    username: cleanUser,
    role: 'admin',
    active: true,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };
  writeStoredUsers([record, ...existing]);
  return { ok: true, user: { username: record.username, role: 'admin' } };
}

export function listSecondaryUsers(): SecondaryAccount[] {
  return readStoredUsers()
    .filter((u) => u.role === 'cambista')
    .map((u) => ({
      username: u.username,
      role: 'cambista',
      cambistaId: u.cambistaId,
      cambistaName: u.cambistaName,
      active: u.active !== false,
      createdAt: u.createdAt,
    }));
}

export function createSecondaryUser(payload: {
  username: string;
  password: string;
  cambistaId?: string;
  cambistaName?: string;
}): { ok: true; account: SecondaryAccount } | { ok: false; error: string; status: number } {
  const cleanUser = payload.username.trim();
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUser)) {
    return {
      ok: false,
      error: 'O usuário deve ter de 3 a 32 caracteres (apenas letras, números, ".", "_" ou "-").',
      status: 400,
    };
  }
  if (payload.password.length < 6 || payload.password.length > 128) {
    return { ok: false, error: 'A senha deve ter pelo menos 6 caracteres.', status: 400 };
  }

  const envUser = process.env.ADMIN_USERNAME?.trim() || 'admin';
  if (isEnvAdminConfigured() && cleanUser.toLowerCase() === envUser.toLowerCase()) {
    return { ok: false, error: 'Este nome de usuário é reservado ao administrador.', status: 409 };
  }

  const users = readStoredUsers();
  if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
    return { ok: false, error: 'Já existe uma conta cadastrada com esse usuário.', status: 409 };
  }

  const { salt, hash } = hashPassword(payload.password);
  const record: StoredUserRecord = {
    username: cleanUser,
    role: 'cambista',
    cambistaId: payload.cambistaId?.trim() || undefined,
    cambistaName: payload.cambistaName?.trim() || undefined,
    active: true,
    salt,
    hash,
    createdAt: new Date().toISOString(),
  };

  writeStoredUsers([record, ...users]);

  return {
    ok: true,
    account: {
      username: record.username,
      role: 'cambista',
      cambistaId: record.cambistaId,
      cambistaName: record.cambistaName,
      active: true,
      createdAt: record.createdAt,
    },
  };
}

export function toggleSecondaryUserStatus(
  username: string
): { ok: true; account: SecondaryAccount } | { ok: false; error: string; status: number } {
  const clean = username.trim().toLowerCase();
  const users = readStoredUsers();
  const idx = users.findIndex((u) => u.username.toLowerCase() === clean && u.role === 'cambista');
  if (idx === -1) {
    return { ok: false, error: 'Conta secundária não encontrada.', status: 404 };
  }

  const current = users[idx];
  const nextActive = current.active === false;
  users[idx] = { ...current, active: nextActive };
  writeStoredUsers(users);

  return {
    ok: true,
    account: {
      username: users[idx].username,
      role: 'cambista',
      cambistaId: users[idx].cambistaId,
      cambistaName: users[idx].cambistaName,
      active: nextActive,
      createdAt: users[idx].createdAt,
    },
  };
}

export function deleteSecondaryUser(
  username: string
): { ok: true } | { ok: false; error: string; status: number } {
  const clean = username.trim().toLowerCase();
  const users = readStoredUsers();
  const target = users.find((u) => u.username.toLowerCase() === clean && u.role === 'cambista');
  if (!target) {
    return { ok: false, error: 'Conta secundária não encontrada.', status: 404 };
  }
  const updated = users.filter((u) => !(u.username.toLowerCase() === clean && u.role === 'cambista'));
  writeStoredUsers(updated);
  return { ok: true };
}

export function checkRateLimit(clientKey: string): { blocked: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = failedLoginTracker.get(clientKey);
  if (!entry) return { blocked: false };
  if (now > entry.resetAt) {
    failedLoginTracker.delete(clientKey);
    return { blocked: false };
  }
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    return { blocked: true, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { blocked: false };
}

export function recordFailedAttempt(clientKey: string): void {
  const now = Date.now();
  const existing = failedLoginTracker.get(clientKey);
  if (!existing || now > existing.resetAt) {
    failedLoginTracker.set(clientKey, { count: 1, resetAt: now + LOCK_WINDOW_MS });
  } else {
    existing.count += 1;
  }
}

export function clearFailedAttempts(clientKey: string): void {
  failedLoginTracker.delete(clientKey);
}

export function verifyCredentials(username: string, password: string): AuthUser | null {
  const cleanUser = username.trim();
  if (!cleanUser || !password) return null;

  // 1. Environment-configured admin override (ADMIN_PASSWORD + optional ADMIN_USERNAME)
  const envPass = process.env.ADMIN_PASSWORD?.trim();
  if (envPass) {
    const envUser = process.env.ADMIN_USERNAME?.trim() || 'admin';
    if (cleanUser.toLowerCase() === envUser.toLowerCase() && safeEqualText(password, envPass)) {
      return { username: envUser, role: 'admin' };
    }
  }

  // 2. Server-stored scrypt-hashed user credentials in .data/auth-users.json
  const users = readStoredUsers();
  const found = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
  if (!found) return null;
  if (found.active === false) return null;

  if (!verifyScryptPassword(password, found.salt, found.hash)) {
    return null;
  }

  return {
    username: found.username,
    role: found.role,
    cambistaId: found.cambistaId,
    cambistaName: found.cambistaName,
  };
}

export function signSessionToken(user: AuthUser): string {
  const payload: SessionPayload = {
    jti: crypto.randomBytes(16).toString('hex'),
    username: user.username,
    role: user.role,
    cambistaId: user.cambistaId,
    cambistaName: user.cambistaName,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');
  if (!safeEqualText(sigB64, expectedSig)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!parsed || typeof parsed.username !== 'string' || typeof parsed.exp !== 'number' || typeof parsed.jti !== 'string') {
      return null;
    }
    if (Date.now() > parsed.exp) return null;
    if (revokedTokenIds.has(parsed.jti)) return null;

    // For secondary cambista accounts, confirm account still exists and is active on server
    if (parsed.role === 'cambista') {
      const users = readStoredUsers();
      const stored = users.find((u) => u.username.toLowerCase() === parsed.username.toLowerCase() && u.role === 'cambista');
      if (!stored || stored.active === false) return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function revokeSessionToken(token: string): void {
  const payload = verifySessionToken(token);
  if (payload) {
    revokedTokenIds.add(payload.jti);
  }
}
