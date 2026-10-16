FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

COPY ["src/Api/CareerPlatform.Api.csproj", "src/Api/"]
RUN dotnet restore "src/Api/CareerPlatform.Api.csproj"

COPY src/Api/ src/Api/
WORKDIR "/src/src/Api"
RUN dotnet build "CareerPlatform.Api.csproj" -c Release -o /app/build
RUN dotnet publish "CareerPlatform.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CareerPlatform.Api.dll"]
