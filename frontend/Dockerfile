FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files first (for caching)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies (fallback if lockfile missing)
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; else pnpm install; fi

# Copy rest of the app
COPY . .

# Build Next.js
RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]