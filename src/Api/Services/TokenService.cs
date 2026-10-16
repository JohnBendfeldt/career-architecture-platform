using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace CareerPlatform.Api.Services;

public interface ITokenService
{
    string GenerateGuestToken();
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateGuestToken()
    {
        var secret = _config["Jwt:Secret"] ?? "SuperSecretCareerArchitectureDemoJwtSigningKey2026!LongEnoughForSha256";
        var issuer = _config["Jwt:Issuer"] ?? "CareerPlatform.Api";
        var audience = _config["Jwt:Audience"] ?? "CareerPlatform.Web";
        var expiryHours = int.TryParse(_config["Jwt:ExpiryHours"], out var hours) ? hours : 24;

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "guest-recruiter-demo-user"),
            new Claim(ClaimTypes.Name, "Guest Recruiter"),
            new Claim(ClaimTypes.Email, "guest@demo.local"),
            new Claim(ClaimTypes.Role, "guest"),
            new Claim("role", "guest"),
            new Claim("guest_mode", "true"),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiryHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
