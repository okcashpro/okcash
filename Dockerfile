# Stage 1: Build dependencies in a temporary stage
FROM node:23.3.0 AS builder

# Install required global dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    git \
    curl \
    sqlite3 && \
    apt-get clean \
    && npm install -g pnpm@9.4.0

# Set working directory
WORKDIR /app

# Add configuration files and install dependencies
ADD pnpm-workspace.yaml /app/pnpm-workspace.yaml
ADD package.json /app/package.json
ADD .npmrc /app/.npmrc
ADD tsconfig.json /app/tsconfig.json
ADD pnpm-lock.yaml /app/pnpm-lock.yaml

# Install dependencies
RUN pnpm install

# Copy source code
ADD docs /app/docs
ADD packages /app/packages
ADD scripts /app/scripts
ADD characters /app/characters
ADD agent /app/agent

# Add dependencies to workspace root
RUN pnpm add -w -D ts-node typescript @types/node

WORKDIR /app/packages/agent

# Add dependencies to the agent package specifically
RUN pnpm add -D ts-node typescript @types/node --filter "@ai16z/agent"

WORKDIR /app/packages/core
RUN pnpm add -D ts-node typescript @types/node --filter "@ai16z/eliza"

WORKDIR /app

# Optional: build step if using TypeScript or other build process
RUN pnpm build

# Stage 2: Production image
FROM node:23.3.0

# Install dependencies required for the final runtime
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    git \
    curl \
    sqlite3 && \
    apt-get clean \
    && npm install -g pnpm@9.4.0

# Set working directory
WORKDIR /app

# Copy built files from the builder stage
COPY --from=builder /app /app

# install playwright
RUN pnpm exec playwright install
RUN pnpm exec playwright install-deps

# Expose application port if running a web server
EXPOSE 3000

# Add health check to ensure the app is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s CMD curl -f http://localhost:3000 || exit 1

# Set environment variables to configure runtime model settings
ENV NODE_ENV=production

# Default command to run the application
CMD ["pnpm", "start"]
