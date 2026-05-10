FROM oven/bun:1 AS base
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build
RUN bun run build

# Run
EXPOSE 3000
CMD ["bun", "run", "start"]