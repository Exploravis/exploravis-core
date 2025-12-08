FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npx vite build


# =======================
# ======BUILD==HO=======
# =======================

FROM node:20-slim

RUN npm install -g serve

WORKDIR /app

COPY --from=builder /app/dist /app/dist

EXPOSE 8080 

CMD ["serve", "-s", "dist", "-l", "3000"]
