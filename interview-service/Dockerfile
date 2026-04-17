FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci --omit=dev

COPY . .

EXPOSE 5001

CMD ["node", "server.js"]