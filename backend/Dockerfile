FROM node:22-slim

# Install required shared libraries for Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libx11-xcb1 libcups2 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Prepare data directory for SQLite
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 4000
CMD ["npm", "start"]
