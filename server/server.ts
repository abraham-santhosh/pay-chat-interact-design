import express, { Request, Response } from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
}

// Resolve __dirname in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'groups.json');

// Ensure the data file exists so that JSON.parse doesn't fail on first run
if (!existsSync(DATA_FILE)) {
  writeFileSync(DATA_FILE, '[]', 'utf-8');
}

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const app = express();

app.use(cors());
app.use(express.json());

/* Helper functions */
const getGroups = (): Group[] => {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) as Group[];
  } catch (err) {
    console.error('Failed to read groups file', err);
    return [];
  }
};

const saveGroups = (groups: Group[]): void => {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write groups file', err);
  }
};

/* Routes */
app.get('/groups', (_req: Request, res: Response<Group[]>) => {
  res.json(getGroups());
});

app.post('/groups', (req: Request, res: Response<Group | { error: string }>) => {
  const { name, description } = req.body as Partial<Group>;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const groups = getGroups();
  const newGroup: Group = {
    id: Date.now().toString(),
    name,
    description: description || '',
    members: [],
    createdAt: new Date().toISOString(),
  };

  groups.push(newGroup);
  saveGroups(groups);

  return res.status(201).json(newGroup);
});

app.post('/groups/:groupId/members', (req: Request, res: Response<Group | { error: string }>) => {
  const { groupId } = req.params;
  const { username } = req.body as { username?: string };

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  if (!group.members.includes(username)) {
    group.members.push(username);
    saveGroups(groups);
  }

  return res.json(group);
});

app.delete('/groups/:groupId/members/:username', (req: Request, res: Response<Group | { error: string }>) => {
  const { groupId, username } = req.params;

  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  group.members = group.members.filter((m) => m !== username);
  saveGroups(groups);

  return res.json(group);
});

app.delete('/groups/:groupId', (req: Request, res: Response<Group | { error: string }>) => {
  const { groupId } = req.params;
  const groups = getGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const [removed] = groups.splice(idx, 1);
  saveGroups(groups);

  return res.json(removed);
});

/* Start server */
app.listen(PORT, () => {
  console.log(`Group server running on http://localhost:${PORT}`);
});