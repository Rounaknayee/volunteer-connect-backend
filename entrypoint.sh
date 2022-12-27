#!/bin/sh

set -e
set -x

npx prisma migrate deploy
npm start