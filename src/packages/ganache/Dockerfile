FROM mhart/alpine-node:14 as builder

RUN apk add --no-cache make gcc g++ python git bash

WORKDIR /app
RUN git config --global url.https://github.com/.insteadOf ssh://git@github.com/
COPY . .

RUN npm i
RUN cd src/packages/ganache && npm run build

COPY src/packages/ganache/dist/cli/ganache.min.js ./ganache.min.js

ENV DOCKER true
EXPOSE 8545

ENTRYPOINT ["node", "/app/ganache.min.js"]
