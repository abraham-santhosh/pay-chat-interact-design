#!/bin/bash

# Split Easy Backend Setup Script
echo "🚀 Setting up Split Easy Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) is installed"

# Create backend directory if it doesn't exist
if [ ! -d "backend" ]; then
    echo "📁 Creating backend directory..."
    mkdir backend
fi

cd backend

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Backend files not found. Please ensure you have the complete repository."
    exit 1
fi

echo "📦 Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.example .env
    
    echo ""
    echo "🔧 Please edit the .env file with your configuration:"
    echo "   - Set a strong JWT_SECRET"
    echo "   - Configure MONGODB_URI (default: mongodb://localhost:27017/split-easy)"
    echo "   - Update CLIENT_URL if needed (default: http://localhost:5173)"
    echo ""
fi

# Check if MongoDB is installed locally
if command -v mongod &> /dev/null; then
    echo "✅ MongoDB is installed locally"
    echo "💡 You can start MongoDB with:"
    echo "   macOS (Homebrew): brew services start mongodb-community"
    echo "   Ubuntu/Linux: sudo systemctl start mongod"
else
    echo "⚠️  MongoDB not found locally. You can:"
    echo "   1. Install MongoDB locally"
    echo "   2. Use MongoDB Atlas (cloud)"
    echo "   3. Use Docker: docker run -d -p 27017:27017 mongo"
fi

echo ""
echo "✨ Backend setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit backend/.env with your configuration"
echo "   2. Start MongoDB (if using local installation)"
echo "   3. Run: cd backend && npm run dev"
echo ""
echo "🌐 Backend will be available at: http://localhost:3000"
echo "📖 API documentation: http://localhost:3000/api/health"