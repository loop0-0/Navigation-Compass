# Stage 1: Build
FROM node:20 as build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:alpine
# Use Nginx templates to handle PORT environment variable substitution
COPY nginx.conf /etc/nginx/templates/default.conf.template
# Set default PORT as requested by Cloud Run, though it will be overridden
ENV PORT=8080

COPY --from=build-stage /app/dist/navigation-compass/browser /usr/share/nginx/html
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
