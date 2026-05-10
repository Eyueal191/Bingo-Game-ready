# Build stage
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm prune --production

# Production stage
FROM node:22-alpine

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app ./
EXPOSE 5055
CMD ["npm", "start"]