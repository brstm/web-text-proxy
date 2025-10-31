FROM node:alpine

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install --omit=dev

COPY web-text-proxy.js ./index.js

EXPOSE 3000

CMD ["node", "index.js"]
