# Use the official Node.js image as a base
FROM node:16

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Install MongoDB
RUN apt-get update && apt-get install -y gnupg
RUN wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | apt-key add -
RUN echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian buster/mongodb-org/4.4 main" | tee /etc/apt/sources.list.d/mongodb-org-4.4.list
RUN apt-get update && apt-get install -y mongodb-org

# Create the MongoDB data directory
RUN mkdir -p /data/db

# Expose the application port
EXPOSE 3000

# Expose the MongoDB port
EXPOSE 27017

# Define environment variable for production
ENV NODE_ENV=production

# Start both MongoDB and the Node.js application
CMD mongod --fork --logpath /var/log/mongodb.log && npm start
