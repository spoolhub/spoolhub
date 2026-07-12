using System.ComponentModel.DataAnnotations;
using API.Services;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/nfc-tags")]
public class NfcTagController(
    INfcTagService nfcTagService,
    INfcScanService nfcScanService,
    INfcReaderService readerService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllTags()
    {
        var tags = await nfcTagService.GetAllAsync();
        return Ok(tags);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTagById(Guid id)
    {
        var tag = await nfcTagService.GetByIdAsync(id);
        return tag is null ? NotFound() : Ok(tag);
    }

    [HttpPost]
    public async Task<IActionResult> RegisterTag([FromBody] RegisterNfcTagRequest request)
    {
        var tag = await nfcTagService.RegisterAsync(request);
        return CreatedAtAction(nameof(GetTagById), new { id = tag.Id }, tag);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTag(Guid id)
    {
        var deleted = await nfcTagService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpGet("lookup")]
    public async Task<IActionResult> LookupByUid([FromQuery][Required] string tagUid)
    {
        var tag = await nfcTagService.LookupByUidAsync(tagUid);
        return tag is null ? NotFound() : Ok(tag);
    }

    [HttpPost("write-url")]
    public IActionResult WriteUrl([FromBody] WriteUrlRequest request)
    {
        readerService.WriteNdefUri(request.Url);
        return Ok();
    }

    [HttpPost("scan")]
    public async Task<IActionResult> ScanTag([FromBody] ScanRequest request)
    {
        var result = await nfcScanService.ProcessScanAsync(request.TagUid);
        return Ok(result);
    }
}
