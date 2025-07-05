import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname because we are using ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'groups.json');

// Ensure the data file exists
if (!existsSync(DATA_FILE)) {
  writeFileSync(DATA_FILE, '[]', 'utf-8');
}

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

function getGroups() {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read groups file', err);
    return [];
  }
}

function saveGroups(groups) {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(groups, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write groups file', err);
  }
}

// Get all groups
app.get('/groups', (_req, res) => {
  res.json(getGroups());
});

// Create a new group
app.post('/groups', (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const groups = getGroups();
  const newGroup = {
    id: Date.now().toString(),
    name,
    description: description || '',
    members: [],
    createdAt: new Date().toISOString(),
  };

  groups.push(newGroup);
  saveGroups(groups);

  res.status(201).json(newGroup);
});

// Add a member to a group
app.post('/groups/:groupId/members', (req, res) => {
  const { groupId } = req.params;
  const { username } = req.body;
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

  res.json(group);
});

// Remove a member from a group
app.delete('/groups/:groupId/members/:username', (req, res) => {
  const { groupId, username } = req.params;
  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  group.members = group.members.filter((m) => m !== username);
  saveGroups(groups);
  res.json(group);
});

// Delete a group
app.delete('/groups/:groupId', (req, res) => {
  const { groupId } = req.params;
  let groups = getGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const [removed] = groups.splice(idx, 1);
  saveGroups(groups);
  res.json(removed);
});

app.listen(PORT, () => {
  console.log(`Group server running on http://localhost:${PORT}`);
});