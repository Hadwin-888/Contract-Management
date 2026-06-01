# Production stage — use locally pre-built dist
FROM nginx:stable-alpine

# Copy built assets (pre-built locally to avoid rolldown x86_64 crash)
COPY dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
