FROM node:22-alpine

WORKDIR /app

# Копируем package для установки зависимостей
COPY package.json package-lock.json ./

RUN npm install

# Копируем остальной исходный код
COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD npx prisma migrate deploy && node dist/main
