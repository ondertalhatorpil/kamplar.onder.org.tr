FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

RUN mkdir -p uploads/participant-files uploads/commitment-documents templates/commitment templates/excel

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 8082

CMD ["sh", "entrypoint.sh"]
