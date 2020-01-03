FROM node:8

WORKDIR /app/container

COPY package*.json ./

RUN npm install

COPY views ./views
COPY templates ./templates
COPY src ./src
COPY public ./public

CMD [ "node", "src/start.js" ]