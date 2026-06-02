FROM node:20-alpine AS build

WORKDIR /app

# Use Aliyun mirror for apk
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Use Aliyun npm mirror
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm ci

COPY . .

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-alpine

WORKDIR /app

# Use Aliyun mirror for apk
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# Install runtime dependencies for better-sqlite3 and OCR
RUN apk add --no-cache python3 make g++ poppler-utils tesseract-ocr tesseract-ocr-data-chi_sim

# Copy built output
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/.env ./

# Create data directory for SQLite
RUN mkdir -p data

EXPOSE 3001

CMD ["node", "dist/index.js"]
