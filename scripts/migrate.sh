#!/bin/bash

# Install ts-node if not already installed
npm install -g ts-node typescript @types/node

# Run the migration script
npx ts-node src/db/migrate.ts

echo "Migration completed."
