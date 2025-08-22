#!/bin/bash

echo "🚀 Setting up Bolt Backend Development Environment"

# Create necessary directories
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p backend/temp

# Copy environment files
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "📝 Created .env file from template"
fi

# Install dependencies
echo "📦 Installing backend dependencies..."
# This assumes you'll add backend dependencies to the main package.json
npm install

# Setup database
echo "🗄️  Setting up database..."
docker-compose -f docker-compose-backend.yml up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
npm run migration:run:backend

# Seed database (optional)
if [ "$1" == "--seed" ]; then
  echo "🌱 Seeding database..."
  npm run seed:run:backend
fi

echo "✅ Backend setup complete!"
echo ""
echo "To start backend development server:"
echo "  npm run dev:backend"
echo ""
echo "To run backend tests:"
echo "  npm run test:backend"
echo ""
echo "To view backend logs:"
echo "  docker-compose -f docker-compose-backend.yml logs -f bolt-backend"
