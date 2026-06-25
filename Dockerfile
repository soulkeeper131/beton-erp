FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN mkdir -p /app/data && touch /app/data/sqlite.db
RUN npm run build
EXPOSE 3000
ENV PORT=3000
CMD ["node", ".next/standalone/server.js"]
