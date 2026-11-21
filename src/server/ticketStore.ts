import fs from 'fs';
import path from 'path';
import type { BetTicket } from '../types/sportsbook.ts';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const TICKETS_FILE_PATH = path.resolve(DATA_DIR, 'tickets.json');

function ensureTicketsFilePath(): string {
  if (!TICKETS_FILE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error('Invalid tickets storage path');
  }
  return TICKETS_FILE_PATH;
}

export function readStoredTickets(seedTickets: BetTicket[] = []): BetTicket[] {
  const filePath = ensureTicketsFilePath();
  try {
    if (!fs.existsSync(filePath)) {
      if (seedTickets.length > 0) {
        writeStoredTickets(seedTickets);
      }
      return seedTickets;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as { tickets?: BetTicket[] };
    return Array.isArray(parsed.tickets) ? parsed.tickets : [];
  } catch {
    return seedTickets;
  }
}

export function writeStoredTickets(tickets: BetTicket[]): void {
  const filePath = ensureTicketsFilePath();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ tickets }, null, 2), { mode: 0o600 });
}

export function appendStoredTicket(ticket: BetTicket, seedTickets: BetTicket[] = []): BetTicket[] {
  const existing = readStoredTickets(seedTickets);
  const next = [ticket, ...existing.filter((t) => t.id !== ticket.id)];
  writeStoredTickets(next);
  return next;
}

export function settleStoredTicket(
  ticketId: string,
  outcome: 'won' | 'lost',
  seedTickets: BetTicket[] = []
): BetTicket | null {
  const existing = readStoredTickets(seedTickets);
  const idx = existing.findIndex((t) => t.id === ticketId && t.status === 'open');
  if (idx === -1) return null;

  const target = existing[idx];
  const payout = outcome === 'won' ? target.potentialReturn : 0;
  const updated: BetTicket = {
    ...target,
    status: outcome,
    payout,
    selections: target.selections.map((s) => ({ ...s, result: outcome })),
  };
  existing[idx] = updated;
  writeStoredTickets(existing);
  return updated;
}

export function cashOutStoredTicket(
  ticketId: string,
  seedTickets: BetTicket[] = []
): BetTicket | null {
  const existing = readStoredTickets(seedTickets);
  const idx = existing.findIndex((t) => t.id === ticketId && t.status === 'open');
  if (idx === -1) return null;

  const target = existing[idx];
  const cashOutValue = Number(
    (target.stake * 0.88 * Math.min(1.45, Math.max(0.85, target.totalOdd * 0.42))).toFixed(2)
  );
  const updated: BetTicket = {
    ...target,
    status: 'cashed_out',
    payout: cashOutValue,
  };
  existing[idx] = updated;
  writeStoredTickets(existing);
  return updated;
}
