// StudySlot Teams — Mock File-Backed Database Store with In-Process Mutex

import fs from 'fs';
import path from 'path';
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

const RUNTIME_DIR = path.join(process.cwd(), 'data', '.runtime');
const DB_FILE = path.join(RUNTIME_DIR, 'db.json');
const SEED_DIR = path.join(process.cwd(), 'data', 'seed');

// In-process mutex queue for safe serial mutations
let lockPromise = Promise.resolve();

function readSeedFile<T>(filename: string): T {
  const filePath = path.join(SEED_DIR, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadInitialData(): MockDatabase {
  return {
    profiles: readSeedFile<Profile[]>('profiles.json'),
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
  if (!fs.existsSync(DB_FILE)) {
    if (!fs.existsSync(RUNTIME_DIR)) {
      fs.mkdirSync(RUNTIME_DIR, { recursive: true });
    }
    const initial = loadInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read runtime db.json, falling back to seed:', err);
    return loadInitialData();
  }
}

/**
 * Execute a mutation under an in-process lock with reliable persistence.
 */
export async function withLock<T>(fn: (db: MockDatabase) => Promise<T> | T): Promise<T> {
  const nextLock = lockPromise.then(async () => {
    const db = await getDb();
    const result = await fn(db);

    // On Windows/OneDrive, direct atomic write inside lock prevents EPERM rename collisions
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');

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
