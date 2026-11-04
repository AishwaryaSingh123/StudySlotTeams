// StudySlot Teams — Mock File-Backed Database Store with In-Process Mutex

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  Profile,
  Room,
  Rules,
  BlackoutDate,
  Team,
  TeamMember,
  Task,
  Milestone,
  Booking,
  ActivityLogItem,
} from '../types';

export interface MockDatabase {
  profiles: Profile[];
  passwords?: Record<string, string>;
  rooms: Room[];
  rules: Rules;
  blackouts: BlackoutDate[];
  teams: Team[];
  team_members: TeamMember[];
  tasks: Task[];
  milestones: Milestone[];
  bookings: Booking[];
  activity_log: ActivityLogItem[];
}

// In serverless environments like Vercel, process.cwd() is read-only.
// os.tmpdir() (/tmp) provides writable storage.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const RUNTIME_DIR = isServerless
  ? path.join(os.tmpdir(), 'studyslot-runtime')
  : path.join(process.cwd(), 'data', '.runtime');
const DB_FILE = path.join(RUNTIME_DIR, 'db.json');
const SEED_DIR = path.join(process.cwd(), 'data', 'seed');

// In-process memory singleton so mutations persist in memory even if disk write fails
let inMemoryDb: MockDatabase | null = null;

// In-process mutex queue for safe serial mutations
let lockPromise = Promise.resolve();

function readSeedFile<T>(filename: string): T {
  const filePath = path.join(SEED_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Error reading seed file ${filename}:`, err);
    return [] as unknown as T;
  }
}

export function loadInitialData(): MockDatabase {
  return {
    profiles: readSeedFile<Profile[]>('profiles.json'),
    passwords: {},
    rooms: readSeedFile<Room[]>('rooms.json'),
    rules: readSeedFile<Rules>('rules.json'),
    blackouts: readSeedFile<BlackoutDate[]>('blackouts.json'),
    teams: readSeedFile<Team[]>('teams.json'),
    team_members: readSeedFile<TeamMember[]>('team_members.json'),
    tasks: readSeedFile<Task[]>('tasks.json'),
    milestones: readSeedFile<Milestone[]>('milestones.json'),
    bookings: readSeedFile<Booking[]>('bookings.json'),
    activity_log: readSeedFile<ActivityLogItem[]>('activity_log.json'),
  };
}

export async function getDb(): Promise<MockDatabase> {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      inMemoryDb = JSON.parse(raw);
      return inMemoryDb!;
    }
  } catch (err) {
    console.warn('Could not read runtime DB from disk, initializing from seed:', err);
  }

  inMemoryDb = loadInitialData();
  try {
    if (!fs.existsSync(RUNTIME_DIR)) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(inMemoryDb, null, 2), 'utf8');
  } catch (err) {
    console.warn('Warning: Could not write initial DB file, continuing in-memory:', err);
  }

  return inMemoryDb;
}

/**
 * Execute a mutation under an in-process lock with reliable persistence.
 */
export async function withLock<T>(fn: (db: MockDatabase) => Promise<T> | T): Promise<T> {
  const nextLock = lockPromise.then(async () => {
    const db = await getDb();
    const result = await fn(db);

    try {
      if (!fs.existsSync(RUNTIME_DIR)) {
        fs.mkdirSync(RUNTIME_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (err) {
      console.warn('Warning: Could not persist DB file to disk, state retained in memory:', err);
    }

    return result;
  });

  lockPromise = nextLock.then(
    () => {},
    () => {}
  );
  return nextLock;
}

export async function resetDbToSeed(): Promise<MockDatabase> {
  return withLock((db) => {
    const initial = loadInitialData();
    Object.keys(db).forEach((k) => delete (db as any)[k]);
    Object.assign(db, initial);
    return db;
  });
}
