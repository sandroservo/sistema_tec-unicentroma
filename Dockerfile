# Next.js 16 + Prisma. Imagem única, migra no boot (ver docker-compose command).
FROM node:22-slim AS base
# openssl: exigido pelo engine do Prisma no slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# build roda `prisma generate && next build` (ver package.json). DATABASE_URL dummy só p/ o build.
ENV DATABASE_URL="postgresql://u:p@localhost:5432/db?schema=public"
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "start"]
