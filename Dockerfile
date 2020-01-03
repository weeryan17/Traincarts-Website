FROM node:8

WORKDIR /app/container

COPY package*.json ./

RUN npm install
RUN npm install -g typescript

COPY views ./views
COPY templates ./templates
COPY public ./public

COPY src ./src
RUN tsc --build tsconfig.json

CMD [ "node", "src/start.js" ]