# Single-container self-host. SQLite lives on the /app/data volume.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/openprofit
ENV PORT=3000
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml drizzle.config.ts ./
COPY src/db ./src/db
RUN pnpm install --frozen-lockfile --prod && pnpm add -D drizzle-kit
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["sh", "-c", "npx drizzle-kit push --force && node .output/server/index.mjs"]
