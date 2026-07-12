using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/health")]
[AllowAnonymous]
public class HealthController(FilamentDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        try
        {
            await db.Database.CanConnectAsync();
            return Ok(new { status = "healthy" });
        }
        catch
        {
            return StatusCode(503, new { status = "unavailable" });
        }
    }
}
