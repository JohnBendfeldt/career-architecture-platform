FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Geo/CareerPlatform.Geo.csproj", "src/Geo/"]
COPY ["tests/Geo.Tests/CareerPlatform.Geo.Tests.csproj", "tests/Geo.Tests/"]
RUN dotnet restore "tests/Geo.Tests/CareerPlatform.Geo.Tests.csproj"

COPY src/Geo/ src/Geo/
COPY tests/Geo.Tests/ tests/Geo.Tests/
RUN dotnet test "tests/Geo.Tests/CareerPlatform.Geo.Tests.csproj" -c Release --no-restore

WORKDIR "/src/src/Geo"
RUN dotnet publish "CareerPlatform.Geo.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "CareerPlatform.Geo.dll"]
