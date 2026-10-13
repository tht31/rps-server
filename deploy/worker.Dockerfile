FROM node:20-alpine

# Cai Python 3.11 cho chay bot sinh vien
RUN apk add --no-cache python3 py3-pip

WORKDIR /app
COPY package*.json ./
RUN npm install --production=false

COPY . .
RUN npm run build

ENV PYTHON_BIN=python3

CMD ["node", "dist/worker/index.js"]
