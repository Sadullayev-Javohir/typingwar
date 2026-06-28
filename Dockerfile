# ── 1-bosqich: build (SDK image) ──────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# global.json (SDK versiyasini fiksatsiya qiladi) + csproj fayllar — restore kesh uchun
COPY global.json ./
COPY src/TypingWar.Domain/TypingWar.Domain.csproj          src/TypingWar.Domain/
COPY src/TypingWar.Application/TypingWar.Application.csproj  src/TypingWar.Application/
COPY src/TypingWar.Infrastructure/TypingWar.Infrastructure.csproj src/TypingWar.Infrastructure/
COPY src/TypingWar.Web/TypingWar.Web.csproj                 src/TypingWar.Web/
RUN dotnet restore src/TypingWar.Web/TypingWar.Web.csproj

# Qolgan manba kod
COPY src/ src/
RUN dotnet publish src/TypingWar.Web/TypingWar.Web.csproj \
    -c Release -o /app --no-restore

# ── 2-bosqich: runtime (yengil aspnet image) ──────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "TypingWar.Web.dll"]
