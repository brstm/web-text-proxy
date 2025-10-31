FROM node:20-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY web-text-proxy.js ./

EXPOSE 3000

CMD ["npm", "run", "start"]
