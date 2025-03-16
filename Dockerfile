FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install
# For production: RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Define the command to run your app
CMD ["node", "src/index.js"]