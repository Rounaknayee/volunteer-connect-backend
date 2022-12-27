FROM node:alpine3.17

ARG VERSION=1.0

WORKDIR /app

LABEL org.opencontainers.image.authors="Nischay Mamidi <NischayPro@protonmail.com>" \
      org.opencontainers.image.description="Docker image to build Volunteer Connection backend" \
      org.opencontainers.image.documentation="https://github.com/Nischay-Pro/volunteer-connection" \
      org.opencontainers.image.licenses="GPL v3.0" \
      org.opencontainers.image.source="https://github.com/Nischay-Pro/volunteer-connection" \
      org.opencontainers.image.title="Volunteer Connection Backend" \
      org.opencontainers.image.url="https://github.com/Nischay-Pro/volunteer-connection" \
      org.opencontainers.image.version="${VERSION}"

RUN apk add --no-cache \
    tini \
    openssl1.1-compat

COPY . .

RUN npm ci --only=production

ENV NODE_ENV production

# RUN npm install

RUN chmod +x ./entrypoint.sh

EXPOSE 8000

RUN npx prisma generate

ENTRYPOINT ["/sbin/tini", "--", "./entrypoint.sh"]