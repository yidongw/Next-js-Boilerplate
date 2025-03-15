# Base node image
FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
# Install system dependencies needed for node-gyp
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build time
ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=1ec30ca8e0f5b67679d91687e18c24e1
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cmVsYXhlZC10dXJrZXktNjcuY2xlcmsuYWNjb3VudHMuZGV2JA
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV CLERK_SECRET_KEY=your_clerk_secret_key

# Build the application
RUN npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1
# Set environment variable for runtime
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=1ec30ca8e0f5b67679d91687e18c24e1
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_cmVsYXhlZC10dXJrZXktNjcuY2xlcmsuYWNjb3VudHMuZGV2JA
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV CLERK_SECRET_KEY=your_clerk_secret_key

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set hostname
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"] 