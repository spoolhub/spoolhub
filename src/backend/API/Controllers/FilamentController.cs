using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/filaments")]
public class FilamentController(IFilamentService filamentService, IFilamentRefreshQueue refreshQueue) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllFilaments()
    {
        var filaments = await filamentService.GetAllAsync();
        return Ok(filaments);
    }

    [HttpPost("refresh")]
    public IActionResult Refresh()
    {
        refreshQueue.TriggerRefresh();
        return Accepted();
    }
}
