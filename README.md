# Split Easy - Complete Full-Stack Application

A comprehensive expense sharing application with real-time group synchronization and member management. This application consists of a React frontend with TypeScript and a Node.js backend with MongoDB.

## Features

### Frontend
- **Modern UI**: Built with React, TypeScript, and ShadCN/UI components
- **Real-time Updates**: Socket.IO integration for live synchronization
- **Expense Management**: Create, track, and settle shared expenses
- **Group Management**: Create groups, invite members, and manage permissions
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### Backend  
- **RESTful API**: Comprehensive API with JWT authentication
- **Real-time Synchronization**: Socket.IO for live updates across all group members
- **Database Integration**: MongoDB with Mongoose ODM
- **Security Features**: Rate limiting, input validation, and secure authentication
- **Member Synchronization**: Changes to groups automatically affect all members

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **ShadCN/UI** - Modern UI components
- **TailwindCSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **React Query** - Server state management
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd split-easy
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your configuration
# Set JWT secrets, MongoDB URI, etc.

# Start MongoDB (if using local installation)
# macOS with Homebrew:
brew services start mongodb-community
# Ubuntu:
sudo systemctl start mongod

# Start the backend server
npm run dev
```

The backend server will start on `http://localhost:3000`

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd ../

# Install dependencies
npm install

# Create environment file (optional)
echo "VITE_API_URL=http://localhost:3000/api" > .env.local

# Start the frontend development server
npm run dev
```

The frontend will start on `http://localhost:5173`

## Key Features Implementation

### Real-time Group Synchronization
When any member makes changes to a group, all other members receive real-time updates:

- **Group Updates**: Name, description, and settings changes
- **Member Management**: Adding/removing members, role changes
- **Expense Updates**: New expenses, settlements, and modifications
- **Activity Notifications**: Real-time toast notifications for all changes

### Backend API Features

#### Authentication
- User registration and login with JWT tokens
- Token refresh mechanism
- Password hashing with bcrypt
- Secure logout and account management

#### Group Management
- Create and manage expense groups
- Invite members via email or invite codes
- Role-based permissions (admin/member)
- Real-time member synchronization
- Activity logging for audit trails

#### Expense Tracking
- Create expenses with multiple split methods (equal, exact, percentage)
- Track settlements and payment methods
- Automatic balance calculations
- Support for receipts and expense categories

### Frontend Features

#### Modern UI Components
- Responsive design with TailwindCSS
- ShadCN/UI component library
- Dark/light theme support
- Loading states and error handling

#### Real-time Updates
- Socket.IO integration for live updates
- Automatic UI synchronization
- Toast notifications for group activities
- Optimistic UI updates

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login  
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile

### Groups  
- `GET /api/groups` - Get user's groups
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group *(affects all members)*
- `POST /api/groups/:id/members` - Add member
- `DELETE /api/groups/:id/members/:memberId` - Remove member
- `POST /api/groups/join/:inviteCode` - Join via invite code

### Expenses
- `GET /api/expenses/group/:groupId` - Get group expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `POST /api/expenses/:id/settle` - Settle expense

## Environment Variables

### Backend (.env)
```bash
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/split-easy
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
CLIENT_URL=http://localhost:5173
```

### Frontend (.env.local)
```bash
VITE_API_URL=http://localhost:3000/api
```

## Development Workflow

### Running Both Services
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
npm run dev
```

### Database Setup
The application will automatically create the necessary MongoDB collections on first run. No manual database setup is required.

### Testing the Integration

1. **Start both servers** (backend on :3000, frontend on :5173)
2. **Register a new user** on the frontend
3. **Create a group** and note the invite code
4. **Open another browser/incognito window**
5. **Register another user** and join the group using the invite code
6. **Test real-time updates** by making changes in one browser and observing updates in the other

## Key Implementation Details

### Real-time Synchronization
- All group changes automatically broadcast to all members
- Socket.IO rooms for efficient message delivery
- Optimistic UI updates with fallback error handling
- Activity logging for complete audit trails

### Security
- JWT-based authentication with refresh tokens
- Input validation and sanitization
- Rate limiting on sensitive operations
- CORS protection and security headers
- Password hashing with bcrypt

### Database Schema
- Users with encrypted data storage
- Groups with member relationships and activity logs
- Expenses with flexible split methods and settlement tracking
- Automatic balance calculations and debt optimization

## Deployment

### Backend Deployment
1. Set production environment variables
2. Use production MongoDB instance
3. Configure SSL/TLS certificates
4. Set up reverse proxy (nginx)
5. Enable MongoDB authentication

### Frontend Deployment
1. Build the production bundle: `npm run build`
2. Deploy to static hosting (Vercel, Netlify, etc.)
3. Configure API URL environment variable
4. Set up SSL certificates

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper testing
4. Ensure both frontend and backend tests pass
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
1. Check the GitHub issues
2. Review the API documentation in `/backend/README.md`
3. Test the API endpoints using the provided examples
4. Verify real-time functionality is working between multiple browser sessions
