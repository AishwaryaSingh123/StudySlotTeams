const fs = require('fs');
const path = require('path');

const seedDir = path.join(__dirname, '..', 'data', 'seed');
const runtimeDir = path.join(__dirname, '..', 'data', '.runtime');
const dbPath = path.join(runtimeDir, 'db.json');

function readSeed(filename) {
  const filePath = path.join(seedDir, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function seedMockDatabase() {
  if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }

  const db = {
    profiles: readSeed('profiles.json'),
    rooms: readSeed('rooms.json'),
    rules: readSeed('rules.json'),
    blackouts: readSeed('blackouts.json'),
    teams: readSeed('teams.json'),
    team_members: readSeed('team_members.json'),
    tasks: readSeed('tasks.json'),
    milestones: readSeed('milestones.json'),
    bookings: readSeed('bookings.json'),
    activity_log: readSeed('activity_log.json'),
  };

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`[StudySlot Teams] Mock database initialized at: ${dbPath}`);
}

seedMockDatabase();
