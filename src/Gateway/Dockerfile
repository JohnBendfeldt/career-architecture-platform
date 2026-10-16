FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

COPY ["src/Gateway/CareerPlatform.Gateway.csproj", "src/Gateway/"]
RUN dotnet restore "src/Gateway/CareerPlatform.Gateway.csproj"

COPY src/Gateway/ src/Gateway/
WORKDIR "/src/src/Gateway"
RUN dotnet build "CareerPlatform.Gateway.csproj" -c Release -o /app/build
RUN dotnet publish "CareerPlatform.Gateway.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS final
WORKDIR /app
EXPOSE 80
EXPOSE 443
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CareerPlatform.Gateway.dll"]
