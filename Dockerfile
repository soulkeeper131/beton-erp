FROM python:3-alpine
COPY index.html .
EXPOSE 80
CMD ["python3", "-m", "http.server", "80"]
