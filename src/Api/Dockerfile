FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Api/CareerPlatform.Api.csproj", "src/Api/"]
COPY ["tests/Api.Tests/CareerPlatform.Api.Tests.csproj", "tests/Api.Tests/"]
RUN dotnet restore "tests/Api.Tests/CareerPlatform.Api.Tests.csproj"

COPY src/Api/ src/Api/
COPY tests/Api.Tests/ tests/Api.Tests/
RUN dotnet test "tests/Api.Tests/CareerPlatform.Api.Tests.csproj" -c Release --no-restore

WORKDIR "/src/src/Api"
RUN dotnet publish "CareerPlatform.Api.csproj" -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "CareerPlatform.Api.dll"]
