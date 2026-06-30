using System.ComponentModel.DataAnnotations;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/brands")]
public class BrandController(IBrandService brandService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await brandService.GetAllAsync());

    [HttpPost]
    public async Task<IActionResult> Add(AddBrandRequest request)
    {
        var brand = await brandService.AddAsync(request);
        if (brand is null) return Conflict(new { error = "A brand with this OFD slug already exists." });
        return CreatedAtAction(nameof(GetAll), new { }, brand);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await brandService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("ofd-search")]
    public async Task<IActionResult> SearchOfd([FromQuery][Required] string q, CancellationToken ct)
    {
        var results = await brandService.SearchOfdAsync(q, ct);
        return Ok(results);
    }
}
