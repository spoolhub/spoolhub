using System.Collections.Concurrent;
using System.Globalization;
using System.Text.Json;

namespace Application.Services;

public sealed record AmsTrayInfo(
    int TrayIndex,
    int Remain,
    bool Occupied,
    string? TagUid,
    string? TrayType,
    string? TrayColor,
    string? TrayIdName,
    string? TraySubBrand,
    string? TrayInfoIdx,
    bool IsBambuFilament,
    float TrayWeightG);

/// <summary>External spool from <c>print.vt_tray</c> when no AMS (<c>tray_now</c> 254).</summary>
public sealed record VtTrayInfo(
    int Remain,
    bool Occupied,
    string? TagUid,
    string? TrayType,
    string? TrayColor,
    string? TrayIdName,
    string? TraySubBrand,
    string? TrayInfoIdx,
    bool IsBambuFilament,
    float TrayWeightG);

public static class AmsMqttTrayParser
{
    private const string EmptyTagUid = "0000000000000000";

    private sealed class TraySlotCache
    {
        public int Remain = -1;
        public string? TagUid;
        public string? TrayType;
        public string? TrayColor;
        public string? TrayIdName;
        public string? TraySubBrand;
        public string? TrayInfoIdx;
        public float TrayWeightG;
    }

    private sealed class PrinterAmsCache
    {
        public string? TrayExistBits;
        public string? TrayIsBblBits;
        public readonly Dictionary<int, TraySlotCache> Slots = new();
    }

    private sealed class VtTrayCache
    {
        public string? TrayNow;
        public int Remain = -1;
        public string? TagUid;
        public string? TrayType;
        public string? TrayColor;
        public string? TrayIdName;
        public string? TraySubBrand;
        public string? TrayInfoIdx;
        public float TrayWeightG;
    }

    private static readonly ConcurrentDictionary<Guid, PrinterAmsCache> Cache = new();
    private static readonly ConcurrentDictionary<Guid, VtTrayCache> VtCache = new();

    public static bool TryParse(
        Guid printerId,
        JsonElement printEl,
        out IReadOnlyList<AmsTrayInfo> trays,
        out Dictionary<string, int> remainBySlotKey,
        out bool hasExplicitTrayExistBits)
    {
        trays = [];
        remainBySlotKey = new Dictionary<string, int>();
        hasExplicitTrayExistBits = false;

        if (printEl.TryGetProperty("ams", out var amsRoot))
            hasExplicitTrayExistBits = MergeAmsIntoCache(printerId, amsRoot, remainBySlotKey);

        if (!Cache.TryGetValue(printerId, out var cache) || cache.Slots.Count == 0)
            return false;

        var occupied = ParseTrayExistBitsFromString(cache.TrayExistBits);
        var isBbl = ParseTrayExistBitsFromString(cache.TrayIsBblBits);
        var hasBits = occupied is not null;
        var result = new List<AmsTrayInfo>();

        foreach (var (trayIdx, slot) in cache.Slots.OrderBy(kv => kv.Key))
        {
            var tagUid = slot.TagUid;
            var trayOccupied = hasBits
                ? occupied![trayIdx]
                : slot.Remain >= 0 || IsValidBambuTagUid(tagUid);
            var isBambuFilament = isBbl?[trayIdx] ?? IsValidBambuTagUid(tagUid);

            result.Add(new AmsTrayInfo(
                trayIdx,
                slot.Remain,
                trayOccupied,
                tagUid,
                slot.TrayType,
                slot.TrayColor,
                slot.TrayIdName,
                slot.TraySubBrand,
                slot.TrayInfoIdx,
                isBambuFilament,
                slot.TrayWeightG));
        }

        trays = result;
        hasExplicitTrayExistBits = hasExplicitTrayExistBits || hasBits;
        return result.Count > 0;
    }

    /// <summary>
    /// Reads Bambu <c>ams_exist_bits</c> when the MQTT payload includes <c>print.ams</c>.
    /// Returns false when the message has no <c>ams</c> block (delta) — caller must not change HasAms.
    /// </summary>
    public static bool TryReadAmsHardwarePresence(
        Guid printerId,
        JsonElement printEl,
        out bool? hasAmsHardware)
    {
        hasAmsHardware = null;
        if (!printEl.TryGetProperty("ams", out var amsRoot))
            return false;

        if (!amsRoot.TryGetProperty("ams_exist_bits", out var existEl))
            return true;

        var raw = ReadTrayExistBitsValue(existEl);
        if (raw is null)
            return true;

        if (!int.TryParse(raw, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var mask))
            return true;

        hasAmsHardware = mask != 0;
        if (!hasAmsHardware.Value)
            ClearCache(printerId);

        return true;
    }

    /// <summary>
    /// Parses Bambu external spool (<c>vt_tray</c> + <c>ams.tray_now</c> 254/255) for non-AMS printers.
    /// </summary>
    public static bool TryParseVtTray(
        Guid printerId,
        JsonElement printEl,
        out VtTrayInfo tray,
        out bool hasExplicitOccupied)
    {
        tray = new VtTrayInfo(-1, false, null, null, null, null, null, null, false, 0);
        hasExplicitOccupied = false;

        var cache = VtCache.GetOrAdd(printerId, _ => new VtTrayCache());
        var messageTouched = false;

        if (printEl.TryGetProperty("ams", out var amsRoot)
            && amsRoot.TryGetProperty("tray_now", out var trayNowEl))
        {
            var trayNow = trayNowEl.GetString();
            if (trayNow is not null)
            {
                cache.TrayNow = trayNow;
                hasExplicitOccupied = trayNow is "254" or "255";
                messageTouched = true;
            }
        }

        if (printEl.TryGetProperty("vt_tray", out var vtEl))
        {
            cache.Remain = vtEl.TryGetProperty("remain", out var remainEl) ? remainEl.GetInt32() : cache.Remain;
            cache.TagUid = vtEl.TryGetProperty("tag_uid", out var uidEl) ? uidEl.GetString() : cache.TagUid;
            cache.TrayType = vtEl.TryGetProperty("tray_type", out var typeEl) ? typeEl.GetString() : cache.TrayType;
            cache.TrayColor = vtEl.TryGetProperty("tray_color", out var colorEl) ? colorEl.GetString() : cache.TrayColor;
            cache.TrayIdName = vtEl.TryGetProperty("tray_id_name", out var nameEl) ? nameEl.GetString() : cache.TrayIdName;
            cache.TraySubBrand = ReadTraySubBrand(vtEl) ?? cache.TraySubBrand;
            cache.TrayInfoIdx = vtEl.TryGetProperty("tray_info_idx", out var idxEl) ? idxEl.GetString() : cache.TrayInfoIdx;
            cache.TrayWeightG = ParseTrayWeightG(vtEl);
            messageTouched = true;
        }

        if (!messageTouched && cache.TrayNow is null && cache.Remain < 0 && cache.TagUid is null)
            return false;

        var occupied = ResolveVtTrayOccupied(cache);
        var isBambuFilament = IsValidBambuTagUid(cache.TagUid);
        tray = new VtTrayInfo(
            cache.Remain,
            occupied,
            cache.TagUid,
            cache.TrayType,
            cache.TrayColor,
            cache.TrayIdName,
            cache.TraySubBrand,
            cache.TrayInfoIdx,
            isBambuFilament,
            cache.TrayWeightG);
        return true;
    }

    private static bool ResolveVtTrayOccupied(VtTrayCache cache)
    {
        if (cache.TrayNow == "255")
            return false;
        if (cache.TrayNow == "254")
            return true;

        return cache.Remain >= 0
            || IsValidBambuTagUid(cache.TagUid)
            || !string.IsNullOrWhiteSpace(cache.TrayType);
    }

    private static void ClearCache(Guid printerId)
    {
        if (!Cache.TryGetValue(printerId, out var cache))
            return;

        cache.Slots.Clear();
        cache.TrayExistBits = "0";
    }

    public static void ClearPrinterCaches(Guid printerId)
    {
        ClearCache(printerId);
        VtCache.TryRemove(printerId, out _);
    }

    public static bool IsValidBambuTagUid(string? tagUid) =>
        !string.IsNullOrWhiteSpace(tagUid) &&
        !string.Equals(tagUid, EmptyTagUid, StringComparison.OrdinalIgnoreCase);

    public static string ParseTrayColorHex(string? trayColor)
    {
        if (string.IsNullOrWhiteSpace(trayColor) || trayColor.Length < 6)
            return "#888888";
        return "#" + trayColor[..6].ToUpperInvariant();
    }

    private static bool MergeAmsIntoCache(
        Guid printerId,
        JsonElement amsRoot,
        Dictionary<string, int> remainBySlotKey)
    {
        var cache = Cache.GetOrAdd(printerId, _ => new PrinterAmsCache());
        var messageHadBits = false;

        if (amsRoot.TryGetProperty("tray_exist_bits", out var bitsEl))
        {
            var bits = ReadTrayExistBitsValue(bitsEl);
            if (bits is not null)
            {
                cache.TrayExistBits = bits;
                messageHadBits = true;
            }
        }

        if (amsRoot.TryGetProperty("tray_is_bbl_bits", out var bblEl))
        {
            var bbl = ReadTrayExistBitsValue(bblEl);
            if (bbl is not null)
                cache.TrayIsBblBits = bbl;
        }

        if (!amsRoot.TryGetProperty("ams", out var amsArray)
            || amsArray.ValueKind != JsonValueKind.Array
            || amsArray.GetArrayLength() == 0)
            return messageHadBits;

        foreach (var amsUnit in amsArray.EnumerateArray())
        {
            var unitId = ReadJsonId(amsUnit, "id") ?? "0";
            if (!amsUnit.TryGetProperty("tray", out var trayArray)) continue;

            foreach (var tray in trayArray.EnumerateArray())
            {
                var trayIdStr = ReadJsonId(tray, "id") ?? "0";
                var remain = tray.TryGetProperty("remain", out var remainEl) ? remainEl.GetInt32() : -1;

                if (remain >= 0)
                    remainBySlotKey[$"unit_{unitId}_tray_{trayIdStr}"] = remain;

                if (unitId != "0" || !int.TryParse(trayIdStr, out var trayIdx) || trayIdx is < 0 or > 3)
                    continue;

                var slot = cache.Slots.GetValueOrDefault(trayIdx) ?? new TraySlotCache();
                slot.Remain = remain;
                slot.TagUid = tray.TryGetProperty("tag_uid", out var uidEl) ? uidEl.GetString() : slot.TagUid;
                slot.TrayType = tray.TryGetProperty("tray_type", out var typeEl) ? typeEl.GetString() : slot.TrayType;
                slot.TrayColor = tray.TryGetProperty("tray_color", out var colorEl) ? colorEl.GetString() : slot.TrayColor;
                slot.TrayIdName = tray.TryGetProperty("tray_id_name", out var nameEl) ? nameEl.GetString() : slot.TrayIdName;
                slot.TraySubBrand = ReadTraySubBrand(tray) ?? slot.TraySubBrand;
                slot.TrayInfoIdx = tray.TryGetProperty("tray_info_idx", out var idxEl) ? idxEl.GetString() : slot.TrayInfoIdx;
                slot.TrayWeightG = ParseTrayWeightG(tray);
                cache.Slots[trayIdx] = slot;
            }
        }

        return messageHadBits;
    }

    private static string? ReadJsonId(JsonElement el, string property)
    {
        if (!el.TryGetProperty(property, out var idEl))
            return null;
        return idEl.ValueKind switch
        {
            JsonValueKind.Number when idEl.TryGetInt32(out var n) => n.ToString(CultureInfo.InvariantCulture),
            JsonValueKind.String => idEl.GetString(),
            _ => idEl.ToString()
        };
    }

    private static string? ReadTraySubBrand(JsonElement tray)
    {
        if (tray.TryGetProperty("tray_sub_brands", out var subEl))
            return subEl.GetString();
        if (tray.TryGetProperty("tray_sub_brand", out var singleEl))
            return singleEl.GetString();
        return null;
    }

    private static float ParseTrayWeightG(JsonElement tray)
    {
        if (!tray.TryGetProperty("tray_weight", out var weightEl)) return 0;
        var raw = weightEl.ValueKind == JsonValueKind.String
            ? weightEl.GetString()
            : weightEl.ToString();
        return float.TryParse(raw, NumberStyles.Float, CultureInfo.InvariantCulture, out var g) ? g : 0;
    }

    private static string? ReadTrayExistBitsValue(JsonElement bitsEl)
    {
        var raw = bitsEl.ValueKind switch
        {
            JsonValueKind.String => bitsEl.GetString(),
            JsonValueKind.Number => bitsEl.TryGetInt64(out var n)
                ? n.ToString("X", CultureInfo.InvariantCulture)
                : bitsEl.ToString(),
            _ => bitsEl.ToString()
        };
        return string.IsNullOrWhiteSpace(raw) ? null : raw.Trim();
    }

    private static bool[]? ParseTrayExistBitsFromString(string? hex)
    {
        if (string.IsNullOrEmpty(hex)
            || !int.TryParse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out var mask))
            return null;

        return
        [
            (mask & 0x1) != 0,
            (mask & 0x2) != 0,
            (mask & 0x4) != 0,
            (mask & 0x8) != 0
        ];
    }
}
