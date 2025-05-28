FROM node:18-alpine AS build
WORKDIR /app
COPY src/ ./src/
FROM httpd:2.4-alpine
COPY apache-config/default.conf /usr/local/apache2/conf/httpd.conf
COPY src/ /usr/local/apache2/htdocs/
EXPOSE 80
CMD ["httpd-foreground"]