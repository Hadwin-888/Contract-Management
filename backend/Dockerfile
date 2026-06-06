FROM node:20-bookworm-slim AS build

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Use Aliyun npm mirror
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm ci

COPY . .

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-bookworm-slim

WORKDIR /app

# Install runtime dependencies for better-sqlite3 and file extraction.
# - unzip: read DOCX/XLSX internal XML and embedded media
# - poppler-utils: pdftoppm for scanned PDF OCR
# - tesseract + chi_sim/eng data: OCR for scanned PDFs and images
# - antiword: legacy .doc text extraction on Linux
# - catdoc: xls2csv for legacy .xls spreadsheets
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
      unzip \
      poppler-utils \
      tesseract-ocr \
      tesseract-ocr-eng \
      tesseract-ocr-chi-sim \
      antiword \
      catdoc \
    && rm -rf /var/lib/apt/lists/*

# Copy built output
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

# Create data directory for SQLite
RUN mkdir -p data

EXPOSE 3001

CMD ["node", "dist/index.js"]
