FROM node:24-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/talkbook.sqlite

RUN corepack enable && mkdir -p /data

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile

COPY packages/contracts packages/contracts
COPY apps/server apps/server

RUN pnpm --filter @talkbook/server build

EXPOSE 3000

CMD ["pnpm", "--filter", "@talkbook/server", "start"]
