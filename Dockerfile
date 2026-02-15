# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ARG MONGODB_URI
ARG ADMIN_SECRET_TOKEN
ARG GEMINI_API_KEY
ARG NEXT_PUBLIC_BASE_URL

ENV MONGODB_URI=$MONGODB_URI
ENV ADMIN_SECRET_TOKEN=$ADMIN_SECRET_TOKEN
ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

RUN npm run build

# Install widget-builder dependencies (vite etc. are devDependencies but needed at runtime for widget generation)
RUN cd .agent/widget-builder && npm ci --include=dev

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/widgets ./widgets
COPY --from=builder --chown=nextjs:nodejs /app/quickwidgets ./quickwidgets
COPY --from=builder --chown=nextjs:nodejs /app/knowledge-seeds ./knowledge-seeds
COPY --from=builder --chown=nextjs:nodejs /app/.agent/widget-builder ./.agent/widget-builder

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
