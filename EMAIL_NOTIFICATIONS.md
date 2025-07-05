# Email Notification System

This group management application now includes a comprehensive email notification system that sends alerts for various group activities.

## Features

The notification system sends emails for the following events:
- ✅ **Group Creation** - When a new group is created
- ✅ **Member Addition** - When someone is added to a group
- ✅ **Member Removal** - When someone is removed from a group  
- ✅ **Group Deletion** - When a group is deleted

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the root directory with your email service configuration:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# Server Configuration
PORT=4000
```

### 2. Email Provider Setup

#### Gmail Setup (Recommended)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `EMAIL_PASS`

#### Other Email Providers
- **Outlook/Hotmail**: Use `smtp.live.com`, port 587
- **Yahoo**: Use `smtp.mail.yahoo.com`, port 587
- **Custom SMTP**: Configure according to your provider's settings

### 3. Install Dependencies

The following packages have been added:
```bash
npm install nodemailer @types/nodemailer dotenv
```

## API Endpoints

### Group Management (Enhanced with Notifications)

#### Create Group with Notifications
```http
POST /groups
Content-Type: application/json

{
  "name": "My Group",
  "description": "Group description",
  "notificationEmails": ["admin@example.com", "manager@example.com"]
}
```

#### Add Member (Sends notification automatically)
```http
POST /groups/:groupId/members
Content-Type: application/json

{
  "username": "newmember"
}
```

#### Remove Member (Sends notification automatically)
```http
DELETE /groups/:groupId/members/:username
```

#### Delete Group (Sends notification automatically)
```http
DELETE /groups/:groupId
```

### Notification Management

#### Update Notification Emails for a Group
```http
PUT /groups/:groupId/notifications
Content-Type: application/json

{
  "notificationEmails": ["new-admin@example.com", "team@example.com"]
}
```

#### Test Email Configuration
```http
GET /notifications/test-connection
```

Response:
```json
{
  "success": true,
  "message": "Email service is configured and ready"
}
```

#### Send Test Notification
```http
POST /notifications/test
Content-Type: application/json

{
  "email": "test@example.com",
  "groupName": "Test Group"
}
```

## Email Templates

The system includes beautiful HTML email templates for each notification type:

### Group Created
- 🎉 Celebrates the new group creation
- Shows group name and description
- Includes creation timestamp

### Member Added
- 👋 Welcomes the new member
- Shows member name and group name
- Encourages group growth

### Member Removed
- 📝 Notifies about member removal
- Shows removed member and group name
- Professional and informative tone

### Group Deleted
- 🗑️ Confirms group deletion
- Shows deleted group name
- Includes deletion timestamp

## Usage Examples

### Setting up a Group with Email Notifications

```javascript
// Create a group with notification emails
const response = await fetch('/groups', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Development Team',
    description: 'Our awesome development team',
    notificationEmails: [
      'manager@company.com',
      'hr@company.com',
      'team-lead@company.com'
    ]
  })
});
```

### Testing Email Configuration

```javascript
// Test if email service is working
const testResponse = await fetch('/notifications/test-connection');
const result = await testResponse.json();

if (result.success) {
  console.log('Email service is ready!');
} else {
  console.log('Email service needs configuration');
}
```

### Sending a Test Email

```javascript
// Send a test notification
const testEmail = await fetch('/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'your-email@example.com',
    groupName: 'My Test Group'
  })
});
```

## Running the Application

1. Set up your `.env` file with email credentials
2. Start the server:
   ```bash
   npm run server
   ```
3. The email service will automatically initialize and verify the connection
4. Look for the console message: "Email service ready for sending notifications"

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Check your `.env` file exists and has correct email credentials
   - Verify EMAIL_USER and EMAIL_PASS are set

2. **"Email service connection failed"**
   - Verify your email provider settings (host, port, security)
   - Check if 2FA is enabled and you're using an app password
   - Ensure less secure app access is enabled (for some providers)

3. **"Failed to send notification"**
   - Check internet connection
   - Verify recipient email addresses are valid
   - Check email provider rate limits

### Debug Mode

The system logs detailed information about email operations:
- Connection status on startup
- Successful notification sends with message IDs
- Failed attempts with error details
- Bulk notification results (sent/failed counts)

## Security Notes

- Store email credentials securely in environment variables
- Use app passwords instead of account passwords
- Consider rate limiting for production environments
- Validate email addresses before adding to notification lists
- Monitor email service usage to avoid exceeding quotas

## Customization

### Email Templates
Email templates can be customized in `server/emailService.ts` in the `generateEmailContent` method.

### Notification Types
Add new notification types by:
1. Extending the `NotificationData` interface
2. Adding new cases to the email template generator
3. Implementing the notification triggers in your routes

### Email Providers
Switch email providers by updating the SMTP configuration in your `.env` file.