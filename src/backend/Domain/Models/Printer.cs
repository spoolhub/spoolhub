namespace Domain.Models;

public class Printer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public int? Port { get; set; }
    public string Protocol { get; set; } = string.Empty;
    public bool HasAms { get; set; } = false;

    // AMS tray spool assignments (slot 0–3)
    public Guid? Tray1SpoolId { get; set; }
    public Guid? Tray2SpoolId { get; set; }
    public Guid? Tray3SpoolId { get; set; }
    public Guid? Tray4SpoolId { get; set; }

    // MQTT AMS tray remain % per slot (-1 = empty, 0–100 = loaded)
    public int? Tray1RemainPct { get; set; }
    public int? Tray2RemainPct { get; set; }
    public int? Tray3RemainPct { get; set; }
    public int? Tray4RemainPct { get; set; }

    // MQTT tray_exist_bits — physical filament present per slot
    public bool Tray1Occupied { get; set; }
    public bool Tray2Occupied { get; set; }
    public bool Tray3Occupied { get; set; }
    public bool Tray4Occupied { get; set; }

    // Non-AMS external spool (vt_tray / tray_now 254)
    public Guid? ExtraSpoolId { get; set; }

    // MQTT vt_tray — null = not reported yet (manual assign still valid)
    public bool? ExtraSpoolOccupied { get; set; }
    public int? ExtraSpoolRemainPct { get; set; }

    // MQTT-reported filament hints (for manual assign when tray occupied but unlinked)
    public string? Tray1MqttMaterial { get; set; }
    public string? Tray1MqttColorName { get; set; }
    public string? Tray1MqttColorHex { get; set; }
    public string? Tray1MqttBrand { get; set; }
    public string? Tray2MqttMaterial { get; set; }
    public string? Tray2MqttColorName { get; set; }
    public string? Tray2MqttColorHex { get; set; }
    public string? Tray2MqttBrand { get; set; }
    public string? Tray3MqttMaterial { get; set; }
    public string? Tray3MqttColorName { get; set; }
    public string? Tray3MqttColorHex { get; set; }
    public string? Tray3MqttBrand { get; set; }
    public string? Tray4MqttMaterial { get; set; }
    public string? Tray4MqttColorName { get; set; }
    public string? Tray4MqttColorHex { get; set; }
    public string? Tray4MqttBrand { get; set; }
    public string? ExtraMqttMaterial { get; set; }
    public string? ExtraMqttColorName { get; set; }
    public string? ExtraMqttColorHex { get; set; }
    public string? ExtraMqttBrand { get; set; }

    public string? AccessCode { get; set; }
    public string? CloudEmail { get; set; }
    public string? CloudPassword { get; set; }
    public string? CloudToken { get; set; }
    public string? CloudUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<PrintJob> PrintJobs { get; set; } = new List<PrintJob>();
}
