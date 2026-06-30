using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record AddLocationRequest([Required] string Name);
