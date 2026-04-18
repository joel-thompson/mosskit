FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json bun.lock ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN bun install --frozen-lockfile

COPY shared shared
COPY backend backend

WORKDIR /app/backend

RUN bun run build

CMD ["bun", "run", "start"]
