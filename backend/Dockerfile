# Use official Node.js image
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
