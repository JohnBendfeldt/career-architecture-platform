FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

COPY ["src/Geo/CareerPlatform.Geo.csproj", "src/Geo/"]
RUN dotnet restore "src/Geo/CareerPlatform.Geo.csproj"

COPY src/Geo/ src/Geo/
WORKDIR "/src/src/Geo"
RUN dotnet build "CareerPlatform.Geo.csproj" -c Release -o /app/build
RUN dotnet publish "CareerPlatform.Geo.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CareerPlatform.Geo.dll"]
