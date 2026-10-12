FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 9000 9001 9002 9003
CMD ["node", "gateway/index.js"]
