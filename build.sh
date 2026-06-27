#!/bin/bash
perl -i -pe 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
npx prisma generate
node prisma/setup-inquiries.js
npx next build
