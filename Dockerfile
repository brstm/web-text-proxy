FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package.json ./

RUN npm install --omit=dev

COPY web-text-proxy.js ./

EXPOSE 3000

CMD ["npm", "run", "start"]
