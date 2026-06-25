FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN mkdir -p /app/data
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", ".next/standalone/server.js"]
