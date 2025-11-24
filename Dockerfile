FROM node:18-alpine

WORKDIR /app

# Copy only the app folder’s package files
COPY random-chat/package.json

RUN npm install --production

# Copy the rest of the app
COPY random-chat/. .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
