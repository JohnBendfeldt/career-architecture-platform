FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Gateway/CareerPlatform.Gateway.csproj", "src/Gateway/"]
COPY ["tests/Gateway.Tests/CareerPlatform.Gateway.Tests.csproj", "tests/Gateway.Tests/"]
RUN dotnet restore "tests/Gateway.Tests/CareerPlatform.Gateway.Tests.csproj"

COPY src/Gateway/ src/Gateway/
COPY tests/Gateway.Tests/ tests/Gateway.Tests/
RUN dotnet test "tests/Gateway.Tests/CareerPlatform.Gateway.Tests.csproj" -c Release --no-restore

WORKDIR "/src/src/Gateway"
RUN dotnet publish "CareerPlatform.Gateway.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "CareerPlatform.Gateway.dll"]
