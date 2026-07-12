using System.ComponentModel.DataAnnotations;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/activities")]
public class ActivityController(IActivityRepository activityRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetActivities(
        [FromQuery][Range(1, 100)] int limit = 20,
        [FromQuery][Range(1, int.MaxValue)] int page = 1,
        [FromQuery] string? eventType = null,
        [FromQuery] string? action = null,
        [FromQuery] string? timePeriod = null,
        [FromQuery] string? sortBy = null)
    {
        var skip = (page - 1) * limit;

        var (activities, total) = await activityRepository.GetPagedAsync(
            limit, skip, eventType, action, timePeriod, sortBy);

        var totalPages = (int)Math.Ceiling(total / (double)limit);
        var response   = activities.Select(a => new ActivityResponse(
            a.Id, a.EventType, a.Action, a.ResourceType,
            a.ResourceName, a.ResourceId, a.Description, a.Icon, a.Snapshot, a.CreatedAt));

        return Ok(new { activities = response, total, page, pageSize = limit, totalPages });
    }

    [HttpDelete]
    public async Task<IActionResult> ClearAll()
    {
        var deleted = await activityRepository.DeleteAllAsync();
        return Ok(new { deleted });
    }
}
