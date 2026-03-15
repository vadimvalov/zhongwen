FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/zhongwen/package.json ./apps/zhongwen/
COPY packages/utils/package.json ./packages/utils/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/zhongwen/node_modules ./apps/zhongwen/node_modules
COPY . .
ENV NITRO_PRESET=node_server
RUN pnpm --filter @zhongwen/app build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/zhongwen/.output ./.output
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
