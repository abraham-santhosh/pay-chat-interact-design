# Split Easy - Backend API

A comprehensive backend API for the Split Easy expense sharing application with real-time group synchronization and member management.

## Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Group Management**: Create, update, and manage expense groups with real-time synchronization
- **Expense Tracking**: Comprehensive expense management with multiple split methods
- **Real-time Updates**: Socket.IO integration for live updates across all group members
- **Member Synchronization**: Changes to groups automatically affect all members
- **Balance Calculation**: Automatic calculation of member balances and debts
- **Activity Logging**: Complete audit trail of all group activities
- **File Uploads**: Support for receipt uploads and avatars
- **Advanced Search**: User search and discovery functionality

## Technology Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database with Mongoose ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

## Installation

1. Clone the repository and navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
- Set a strong JWT secret
- Configure MongoDB connection string
- Set the client URL for CORS

5. Start MongoDB service (if running locally):
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu
sudo systemctl start mongod
```

6. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password
- `POST /api/auth/logout` - Logout user
- `DELETE /api/auth/account` - Deactivate account

### Groups
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:groupId` - Get specific group details
- `POST /api/groups` - Create new group
- `PUT /api/groups/:groupId` - Update group details *(affects all members)*
- `PUT /api/groups/:groupId/settings` - Update group settings *(affects all members)*
- `POST /api/groups/:groupId/members` - Add member to group
- `DELETE /api/groups/:groupId/members/:memberId` - Remove member from group
- `PUT /api/groups/:groupId/members/:memberId/role` - Update member role
- `POST /api/groups/join/:inviteCode` - Join group by invite code
- `GET /api/groups/:groupId/balances` - Get group member balances
- `GET /api/groups/:groupId/activity` - Get group activity log
- `DELETE /api/groups/:groupId` - Delete group

### Expenses
- `GET /api/expenses/group/:groupId` - Get group expenses
- `GET /api/expenses/user` - Get user's expenses across all groups
- `GET /api/expenses/:expenseId` - Get specific expense
- `POST /api/expenses` - Create new expense
- `PUT /api/expenses/:expenseId` - Update expense
- `POST /api/expenses/:expenseId/settle` - Settle expense
- `POST /api/expenses/:expenseId/settlements` - Add settlement to expense
- `DELETE /api/expenses/:expenseId` - Delete expense
- `GET /api/expenses/group/:groupId/stats` - Get expense statistics

### Users
- `GET /api/users/search` - Search users by email or name
- `GET /api/users/:userId` - Get user profile
- `GET /api/users/:userId/groups` - Get user's groups
- `PUT /api/users/:userId/preferences` - Update user preferences
- `PUT /api/users/:userId/avatar` - Update user avatar
- `GET /api/users/:userId/stats` - Get user statistics
- `GET /api/users/:userId/activity` - Get user activity feed

### Health Check
- `GET /api/health` - Server health status

## Real-time Events

The application uses Socket.IO for real-time updates. Clients should listen for these events:

### Group Events
- `group-updated` - Group details changed
- `group-settings-updated` - Group settings changed
- `member-added` - New member added to group
- `member-removed` - Member removed from group
- `member-joined` - Member joined via invite code
- `member-role-updated` - Member role changed
- `group-deleted` - Group was deleted

### Expense Events
- `expense-created` - New expense added
- `expense-updated` - Expense details updated
- `expense-settled` - Expense was settled
- `expense-deleted` - Expense was deleted
- `settlement-added` - Settlement added to expense

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  avatar: String,
  groups: [ObjectId],
  preferences: {
    currency: String,
    notifications: {
      email: Boolean,
      push: Boolean
    }
  },
  isActive: Boolean,
  lastLogin: Date
}
```

### Group Model
```javascript
{
  name: String,
  description: String,
  createdBy: ObjectId,
  members: [{
    user: ObjectId,
    role: String, // 'admin' | 'member'
    joinedAt: Date,
    isActive: Boolean
  }],
  expenses: [ObjectId],
  settings: {
    allowMemberInvites: Boolean,
    autoSettleDebts: Boolean,
    currency: String,
    splitMethod: String // 'equal' | 'exact' | 'percentage'
  },
  inviteCode: String (unique),
  balances: [{
    user: ObjectId,
    balance: Number,
    owes: [{ to: ObjectId, amount: Number }],
    owed: [{ from: ObjectId, amount: Number }]
  }],
  activityLog: [{
    action: String,
    performedBy: ObjectId,
    details: Mixed,
    timestamp: Date
  }],
  totalExpenses: Number,
  totalSettled: Number,
  isActive: Boolean
}
```

### Expense Model
```javascript
{
  description: String,
  amount: Number,
  currency: String,
  category: String,
  paidBy: ObjectId,
  participants: [{
    user: ObjectId,
    share: Number,
    shareType: String
  }],
  group: ObjectId,
  splitMethod: String,
  date: Date,
  settled: Boolean,
  settlements: [{
    from: ObjectId,
    to: ObjectId,
    amount: Number,
    method: String,
    transactionId: String,
    settledAt: Date
  }],
  notes: String,
  tags: [String],
  location: {
    name: String,
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  receipt: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number
  },
  recurring: {
    isRecurring: Boolean,
    frequency: String,
    nextDate: Date,
    endDate: Date
  },
  createdBy: ObjectId,
  editHistory: [{
    editedBy: ObjectId,
    editedAt: Date,
    changes: Mixed
  }]
}
```

## Key Features

### Group Synchronization
When changes are made to a group, all members are automatically notified and their data is synchronized:
- Group name/description updates
- Settings changes (currency, split method, etc.)
- Member additions/removals
- Role changes
- Expense additions/updates

### Balance Calculation
The system automatically calculates member balances:
- Who owes money to whom
- Total amount owed/owed to each member
- Settlement suggestions
- Real-time updates when expenses are added/settled

### Activity Logging
Complete audit trail of all group activities:
- Member actions (join, leave, role changes)
- Expense actions (create, update, settle, delete)
- Settings changes
- Administrative actions

### Security Features
- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting
- CORS protection
- Helmet security headers
- User permission checks for all operations

### Error Handling
- Comprehensive error messages
- Input validation errors
- Database constraint violations
- Authentication and authorization errors
- Graceful error responses

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Seeding
```bash
npm run seed
```

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Use a production MongoDB instance
3. Set strong JWT secrets
4. Configure proper CORS origins
5. Use a reverse proxy (nginx) for static files
6. Enable MongoDB authentication
7. Set up SSL/TLS certificates
8. Configure proper logging
9. Set up monitoring and alerts

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the ISC License.