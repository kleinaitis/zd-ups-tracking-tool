FROM public.ecr.aws/lambda/nodejs:18-x86_64

WORKDIR /app

# Installs both package and package-lock files
COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start" ]