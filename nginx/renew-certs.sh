#!/bin/sh
# Let's Encrypt renewal — runs certbot then reloads nginx
docker run --rm \
  -v /home/t_burgernyc/nginx/certbot/conf:/etc/letsencrypt \
  -v /home/t_burgernyc/nginx/certbot/www:/var/www/certbot \
  certbot/certbot renew --quiet --webroot -w /var/www/certbot

docker restart hermes_nginx
