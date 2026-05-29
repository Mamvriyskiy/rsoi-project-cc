FROM node:16.14.2 AS build

WORKDIR /app
ENV CI=false

COPY package*.json ./
RUN npm ci --silent

COPY . .
RUN npm run build

FROM nginx:1.25-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
