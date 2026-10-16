var builder = WebApplication.CreateBuilder(args);

// Add YARP reverse proxy
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

// Add permissive CORS for frontend SPA
builder.Services.AddCors(options =>
{
    options.AddPolicy("SpaCorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("SpaCorsPolicy");

app.MapGet("/health", () => Results.Ok(new
{
    service = "Gateway",
    status = "Healthy",
    timestamp = DateTime.UtcNow
}));

app.MapReverseProxy();

app.Run();

public partial class Program { }
