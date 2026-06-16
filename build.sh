#!/bin/bash
set -e

echo "=== Switching provider to postgresql ==="
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

echo "=== Pushing DB schema ==="
npx prisma db push --accept-data-loss --skip-generate

echo "=== Generating Prisma client ==="
npx prisma generate

echo "=== Building Next.js ==="
next build
