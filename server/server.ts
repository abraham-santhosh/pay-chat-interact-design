import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { emailService, NotificationData } from './emailService.js';
import paymentRoutes from './paymentRoutes.js';
import morgan from 'morgan';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
  notificationEmails?: string[]; // Optional email list for notifications
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

// HTTP request logging
app.use(morgan('combined'));

// Payment routes
app.use('/payments', paymentRoutes);

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

app.post('/groups', async (req: Request, res: Response<Group | { error: string }>) => {
  const { name, description, notificationEmails } = req.body as Partial<Group>;
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
    notificationEmails: notificationEmails || [],
  };

  groups.push(newGroup);
  saveGroups(groups);

  // Send notification emails if configured
  if (newGroup.notificationEmails && newGroup.notificationEmails.length > 0) {
    const notificationData: NotificationData = {
      groupName: newGroup.name,
      groupDescription: newGroup.description,
      actionType: 'group_created',
      timestamp: newGroup.createdAt,
    };

    emailService.sendBulkNotification(newGroup.notificationEmails, notificationData)
      .then(result => {
        console.log(`Group creation notification sent to ${result.sent} recipients, ${result.failed} failed`);
      })
      .catch(error => {
        console.error('Failed to send group creation notification:', error);
      });
  }

  return res.status(201).json(newGroup);
});

app.post('/groups/:groupId/members', async (req: Request, res: Response<Group | { error: string }>) => {
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

    // Send notification emails if configured
    if (group.notificationEmails && group.notificationEmails.length > 0) {
      const notificationData: NotificationData = {
        groupName: group.name,
        memberName: username,
        actionType: 'member_added',
        timestamp: new Date().toISOString(),
      };

      emailService.sendBulkNotification(group.notificationEmails, notificationData)
        .then(result => {
          console.log(`Member addition notification sent to ${result.sent} recipients, ${result.failed} failed`);
        })
        .catch(error => {
          console.error('Failed to send member addition notification:', error);
        });
    }
  }

  return res.json(group);
});

app.delete('/groups/:groupId/members/:username', async (req: Request, res: Response<Group | { error: string }>) => {
  const { groupId, username } = req.params;

  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const wasRemoved = group.members.includes(username);
  group.members = group.members.filter((m) => m !== username);
  saveGroups(groups);

  // Send notification emails if the member was actually removed and notifications are configured
  if (wasRemoved && group.notificationEmails && group.notificationEmails.length > 0) {
    const notificationData: NotificationData = {
      groupName: group.name,
      memberName: username,
      actionType: 'member_removed',
      timestamp: new Date().toISOString(),
    };

    emailService.sendBulkNotification(group.notificationEmails, notificationData)
      .then(result => {
        console.log(`Member removal notification sent to ${result.sent} recipients, ${result.failed} failed`);
      })
      .catch(error => {
        console.error('Failed to send member removal notification:', error);
      });
  }

  return res.json(group);
});

app.delete('/groups/:groupId', async (req: Request, res: Response<Group | { error: string }>) => {
  const { groupId } = req.params;
  const groups = getGroups();
  const idx = groups.findIndex((g) => g.id === groupId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Group not found' });
  }

  const [removed] = groups.splice(idx, 1);
  saveGroups(groups);

  // Send notification emails if configured
  if (removed.notificationEmails && removed.notificationEmails.length > 0) {
    const notificationData: NotificationData = {
      groupName: removed.name,
      actionType: 'group_deleted',
      timestamp: new Date().toISOString(),
    };

    emailService.sendBulkNotification(removed.notificationEmails, notificationData)
      .then(result => {
        console.log(`Group deletion notification sent to ${result.sent} recipients, ${result.failed} failed`);
      })
      .catch(error => {
        console.error('Failed to send group deletion notification:', error);
      });
  }

  return res.json(removed);
});

/* Notification Management Routes */

// Update notification emails for a group
app.put('/groups/:groupId/notifications', async (req: Request, res: Response<Group | { error: string }>) => {
  const { groupId } = req.params;
  const { notificationEmails } = req.body as { notificationEmails?: string[] };

  if (!notificationEmails || !Array.isArray(notificationEmails)) {
    return res.status(400).json({ error: 'notificationEmails array is required' });
  }

  const groups = getGroups();
  const group = groups.find((g) => g.id === groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  group.notificationEmails = notificationEmails;
  saveGroups(groups);

  return res.json(group);
});

// Test email configuration
app.get('/notifications/test-connection', async (req: Request, res: Response<{ success: boolean; message: string }>) => {
  try {
    const isConnected = await emailService.testConnection();
    if (isConnected) {
      return res.json({ success: true, message: 'Email service is configured and ready' });
    } else {
      return res.json({ success: false, message: 'Email service is not configured or connection failed' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error testing email connection' });
  }
});

// Send test notification
app.post('/notifications/test', async (req: Request, res: Response<{ success: boolean; message: string }>) => {
  const { email, groupName } = req.body as { email?: string; groupName?: string };

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const testData: NotificationData = {
      groupName: groupName || 'Test Group',
      groupDescription: 'This is a test notification to verify your email configuration.',
      actionType: 'group_created',
      timestamp: new Date().toISOString(),
    };

    const success = await emailService.sendNotification(email, testData);
    
    if (success) {
      return res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      return res.json({ success: false, message: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    return res.status(500).json({ success: false, message: 'Error sending test notification' });
  }
});

/* Start server */
app.listen(PORT, () => {
  console.log(`Group server running on http://localhost:${PORT}`);
});

// Global error handler – any uncaught errors
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});