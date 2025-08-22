#!/bin/bash

echo "🚀 Setting up Bolt Backend Development Environment"

# Create necessary directories
mkdir -p logs
mkdir -p uploads
mkdir -p temp

# Copy environment files
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📝 Created .env file from template"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Setup database
echo "🗄️  Setting up database..."
docker-compose up -d postgres redis

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run migrations
echo "🔄 Running database migrations..."
npm run migration:run

# Seed database (optional)
if [ "$1" == "--seed" ]; then
  echo "🌱 Seeding database..."
  npm run seed:run
fi

echo "✅ Setup complete!"
echo ""
echo "To start development server:"
echo "  npm run dev"
echo ""
echo "To run tests:"
echo "  npm test"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f bolt-backend"
