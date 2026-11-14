var builder = WebApplication.CreateBuilder(args);

// Add YARP reverse proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Restrict CORS to explicit allowed origins
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[]
    {
        "https://johnbendfeldt.com",
        "https://www.johnbendfeldt.com",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5050",
        "http://localhost:3000"
    };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowedOrigins");

app.MapGet("/health", () => Results.Ok(new
{
    service = "Gateway",
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

app.MapReverseProxy();

app.Run();

public partial class Program { }
