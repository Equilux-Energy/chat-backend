FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install production dependencies and handle conflicts
RUN npm install --omit=dev --legacy-peer-deps

COPY . .

EXPOSE 8080

CMD ["node", "src/index.js"]