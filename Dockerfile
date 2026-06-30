# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY src/frontend/web/package*.json ./
RUN npm ci
COPY src/frontend/web/ ./
RUN npm run build

# Stage 2: Build backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY src/backend/ ./
RUN dotnet publish API/API.csproj -c Release -o /publish --no-self-contained

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=backend-build /publish ./
COPY --from=frontend-build /app/dist ./wwwroot
RUN mkdir -p /data
VOLUME /data
EXPOSE 4848
ENV ASPNETCORE_URLS=http://+:4848
ENV ASPNETCORE_ENVIRONMENT=Production
ENTRYPOINT ["dotnet", "API.dll"]
