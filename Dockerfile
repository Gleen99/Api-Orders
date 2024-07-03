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

# Expose the application port
EXPOSE 3000

# Define environment variable for production
ENV NODE_ENV=production

# Command to run the application
CMD ["npm", "start"]
