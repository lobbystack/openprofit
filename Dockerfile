# Single-container self-host. PGlite data lives on the /app/data volume.
FROM oven/bun:1.3-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY packages/cli/package.json packages/cli/
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.3-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/openprofit
ENV PORT=3000
COPY package.json bun.lock ./
COPY packages/cli/package.json packages/cli/
RUN bun install --frozen-lockfile --production --ignore-scripts
COPY drizzle ./drizzle
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
