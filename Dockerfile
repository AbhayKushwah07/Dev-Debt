# Stage 1: Build the Angular app
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build --configuration=production

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy the build output to replace the default nginx contents.
# Note: 'dist/dev-debt/browser' depends on angular.json outputPath.
# If using Angular 17+ default builder (esbuild), it might be inside browser directory.
# We will assume dist/dev-debt/browser based on standard 17+ defaults.
COPY --from=build /app/dist/dev-debt/browser /usr/share/nginx/html

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
