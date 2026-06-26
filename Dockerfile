FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=production
RUN echo "Deploy: 1782504022 > /app/.build_id
RUN mkdir -p /app/data
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm run build
EXPOSE 3000
ENV PORT=3000
CMD ["npx", "next", "start"]