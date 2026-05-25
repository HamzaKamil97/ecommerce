FROM node:20-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
EXPOSE 9200
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
