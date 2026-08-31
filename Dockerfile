FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
ARG EXPO_PUBLIC_API_URL=https://onmangeou-backend-api-production.up.railway.app/api/v1
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
COPY . .
RUN pnpm exec expo export --platform web

FROM nginx:1.27-alpine AS runner
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
