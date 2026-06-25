FROM alpine:latest
COPY index.html /var/www/
CMD ["httpd", "-f", "-p", "80", "-h", "/var/www"]
EXPOSE 80
