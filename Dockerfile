# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY ./src ./src

# Expose the port your app runs on
EXPOSE 8080

# Command to run the application
CMD ["node", "src/index.js"]