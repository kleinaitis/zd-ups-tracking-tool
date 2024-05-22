FROM node:18

WORKDIR /app

# Installs both package and package-lock files
COPY package*.json ./


RUN npm install

COPY . .

CMD [ "npm", "start" ]