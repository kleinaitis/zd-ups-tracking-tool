FROM public.ecr.aws/lambda/nodejs:18-x86_64

WORKDIR ${LAMBDA_TASK_ROOT}

# Installs both package and package-lock files
COPY package*.json ./

RUN npm install

COPY . ${LAMBDA_TASK_ROOT}

CMD [ "index.handler" ]
