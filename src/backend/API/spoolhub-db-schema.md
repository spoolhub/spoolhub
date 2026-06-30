# SpoolHub Database Schema Redesign

## Current Schema Analysis

The existing schema has the following issues:
1. `PrintJobs` has a direct `SpoolId` that doesn't support AMS tray-based resolution
2. No `PrinterSpoolHistory` table for tracking assignments
3. NFC tags are embedded in the `NfcTags` table but not properly linked to spool assignments
4. `EstimatedFinishTime` is `int?` (minutes) instead of a proper timestamp
5. No indexes on commonly queried columns

---

## New Schema Design

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Spools      │     │    NfcTags      │     │    Printers     │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Id (PK)         │◄────│ SpoolId (FK)    │     │ Id (PK)         │
│ Brand           │     │ Id (PK)         │     │ Name            │
│ Material        │     │ TagUid (UNIQUE) │     │ Brand           │
│ ColorName       │     │ Type            │     │ Model           │
│ ColorHex        │     │ CreatedAt       │     │ SerialNumber    │
│ InitialWeightG  │     └─────────────────┘     │ IpAddress       │
│ CurrentWeightG  │                             │ Port            │
│ SpoolWeightG    │                             │ Protocol        │
│ DiameterMm      │                             │ HasAms          │
│ LowStockThresh  │                             │ Tray1SpoolId(FK)│──────┐
│ IsActive        │                             │ Tray2SpoolId(FK)│──────┤
│ IsArchived      │                             │ Tray3SpoolId(FK)│──────┤
│ ArchivedAt      │                             │ Tray4SpoolId(FK)│──────┤
│ CreatedAt       │                             │ ExtraSpoolId(FK)│──────┤
│ LastScannedAt   │                             │ AccessCode      │      │
│ StockLocation   │                             │ CloudEmail      │      │
│ Notes           │                             │ CloudToken      │      │
│ Price           │                             │ CreatedAt       │      │
│ Density         │                             └─────────────────┘      │
│ PrintTempMin    │                                      │               │
│ PrintTempMax    │                                      │               │
│ BedTempMin      │                                      │               │
│ BedTempMax      │                                      │               │
└─────────────────┘                                      │               │
         │                                               │               │
         │                                               │               │
         ▼                                               ▼               │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐      │
│   PrintJobs     │     │PrinterSpoolHist │     │   Activities    │      │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤      │
│ Id (PK)         │     │ Id (PK)         │     │ Id (PK)         │      │
│ PrinterId (FK)  │────►│ PrinterId (FK)  │     │ EventType       │      │
│ SpoolId (FK)    │────►│ SpoolId (FK)    │     │ Action          │      │
│ PrintFileName   │     │ SlotIndex       │     │ ResourceType    │      │
│ TaskId          │     │ AssignedAt      │     │ ResourceName    │      │
│ Status          │     │ RemovedAt       │     │ ResourceId      │      │
│ GramsUsed       │     │ Source          │     │ Description     │      │
│ StartedAt       │     └─────────────────┘     │ Icon            │      │
│ FinishedAt      │                             │ Snapshot        │      │
│ Source          │                             │ CreatedAt       │      │
│ Notes           │                             └─────────────────┘      │
│ FilamentDeducted│                                                      │
│ EstimFinishTime │                                                      │
└─────────────────┘                                                      │
         │                                                               │
         └───────────────────────────────────────────────────────────────┘
                              (all SpoolId FKs point to Spools.Id)
```

---

## Complete Table Definitions

### 1. Spools

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | TEXT (GUID) | PRIMARY KEY | Unique spool identifier |
| Brand | TEXT | NOT NULL | Filament brand |
| Material | TEXT | NOT NULL | Material type (PLA, PETG, etc.) |
| ColorName | TEXT | NOT NULL | Human-readable color name |
| ColorHex | TEXT | NOT NULL | Hex color code |
| InitialWeightG | REAL | NOT NULL | Initial weight in grams |
| CurrentWeightG | REAL | NOT NULL | Current remaining weight |
| SpoolWeightG | REAL | NULL | Empty spool weight |
| DiameterMm | REAL | NULL | Filament diameter (1.75/2.85) |
| LowStockThresh | REAL | NULL | Low stock warning threshold |
| IsActive | INTEGER | NOT NULL, DEFAULT 0 | Whether spool is currently active |
| IsArchived | INTEGER | NOT NULL, DEFAULT 0 | Whether spool is archived |
| ArchivedAt | TEXT | NULL | Timestamp when archived |
| CreatedAt | TEXT | NOT NULL | Creation timestamp |
| LastScannedAt | TEXT | NULL | Last NFC scan timestamp |
| StockLocation | TEXT | NULL | Storage location |
| Notes | TEXT | NULL | Optional notes |
| Price | REAL | NULL | Purchase price |
| Density | REAL | NULL | Filament density |
| PrintTempMin | INTEGER | NULL | Min print temperature |
| PrintTempMax | INTEGER | NULL | Max print temperature |
| BedTempMin | INTEGER | NULL | Min bed temperature |
| BedTempMax | INTEGER | NULL | Max bed temperature |

**Indexes:**
- `IX_Spools_IsActive` on `IsActive` (filter active spools)
- `IX_Spools_Brand` on `Brand` (search by brand)
- `IX_Spools_IsArchived` on `IsArchived` (filter archived)

---

### 2. NfcTags

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | TEXT (GUID) | PRIMARY KEY | Unique tag record |
| SpoolId | TEXT | NOT NULL, FK → Spools.Id, ON DELETE CASCADE | Linked spool |
| TagUid | TEXT | NOT NULL, UNIQUE | NFC tag UID |
| Type | TEXT | NULL | Tag type identifier |
| CreatedAt | TEXT | NOT NULL | Creation timestamp |

**Indexes:**
- `IX_NfcTags_TagUid` UNIQUE on `TagUid` (fast lookup)
- `IX_NfcTags_SpoolId` on `SpoolId` (find tags for spool)

---

### 3. Printers

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | TEXT (GUID) | PRIMARY KEY | Unique printer identifier |
| Name | TEXT | NOT NULL | Printer display name |
| Brand | TEXT | NOT NULL | Printer brand |
| Model | TEXT | NULL | Printer model |
| SerialNumber | TEXT | NULL | Bambu serial number |
| IpAddress | TEXT | NOT NULL | IP address |
| Port | INTEGER | NULL | MQTT port |
| Protocol | TEXT | NOT NULL | Connection protocol |
| HasAms | INTEGER | NOT NULL, DEFAULT 0 | AMS system present |
| Tray1SpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Tray 1 spool |
| Tray2SpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Tray 2 spool |
| Tray3SpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Tray 3 spool |
| Tray4SpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Tray 4 spool |
| ExtraSpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Non-AMS spool |
| AccessCode | TEXT | NULL | Bambu access code |
| CloudEmail | TEXT | NULL | Bambu cloud email |
| CloudToken | TEXT | NULL | Bambu cloud token |
| CreatedAt | TEXT | NOT NULL | Creation timestamp |

**Indexes:**
- `IX_Printers_HasAms` on `HasAms` (filter by AMS capability)
- `IX_Printers_SerialNumber` on `SerialNumber` (lookup by serial)

---

### 4. PrintJobs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | TEXT (GUID) | PRIMARY KEY | Unique job identifier |
| PrinterId | TEXT | NOT NULL, FK → Printers.Id, ON DELETE CASCADE | Source printer |
| SpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Spool used |
| PrintFileName | TEXT | NULL | File name printed |
| TaskId | TEXT | NULL | Bambu task ID |
| Status | TEXT | NOT NULL | Job status |
| GramsUsed | REAL | NOT NULL, DEFAULT 0 | Filament consumed |
| StartedAt | TEXT | NOT NULL | Start timestamp |
| FinishedAt | TEXT | NULL | Completion timestamp |
| Source | TEXT | NOT NULL, DEFAULT 'mqtt' | Job source |
| Notes | TEXT | NULL | Optional notes |
| FilamentDeducted | INTEGER | NOT NULL, DEFAULT 0 | Deduction flag |
| EstimFinishTime | TEXT | NULL | Estimated finish (ISO 8601) |

**Indexes:**
- `IX_PrintJobs_TaskId` on `TaskId` (MQTT lookup)
- `IX_PrintJobs_PrinterId` on `PrinterId` (printer history)
- `IX_PrintJobs_SpoolId` on `SpoolId` (spool usage)
- `IX_PrintJobs_Status` on `Status` (filter by status)

---

### 5. PrinterSpoolHistory

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | TEXT (GUID) | PRIMARY KEY | Unique record |
| PrinterId | TEXT | NOT NULL, FK → Printers.Id, ON DELETE CASCADE | Printer |
| SpoolId | TEXT | NULL, FK → Spools.Id, ON DELETE SET NULL | Spool |
| SlotIndex | INTEGER | NULL | AMS tray index (0-3), NULL for Extra |
| AssignedAt | TEXT | NOT NULL | Assignment timestamp |
| RemovedAt | TEXT | NULL | Removal timestamp |
| Source | TEXT | NULL | Assignment source (manual/nfc/mqtt) |

**Indexes:**
- `IX_PrinterSpoolHistory_PrinterId` on `PrinterId`
- `IX_PrinterSpoolHistory_SpoolId` on `SpoolId`
- `IX_PrinterSpoolHistory_AssignedAt` on `AssignedAt`

---

### 6. Activities

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | TEXT (GUID) | PRIMARY KEY | Unique record |
| EventType | TEXT | NOT NULL | Event type |
| Action | TEXT | NOT NULL | Action performed |
| ResourceType | TEXT | NULL | Resource type |
| ResourceName | TEXT | NULL | Resource name |
| ResourceId | TEXT | NULL | Soft reference (no FK) |
| Description | TEXT | NULL | Description |
| Icon | TEXT | NULL | Icon name |
| Snapshot | TEXT | NULL | JSON snapshot |
| CreatedAt | TEXT | NOT NULL | Event timestamp |

**Indexes:**
- `IX_Activities_EventType` on `EventType`
- `IX_Activities_ResourceId` on `ResourceId`
- `IX_Activities_CreatedAt` on `CreatedAt`

---

### 7. AppSettings

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Key | TEXT | PRIMARY KEY | Setting key |
| Value | TEXT | NULL | Setting value |

---

## Foreign Key Relationships

| Parent | Child | FK Column | On Delete | On Update |
|--------|-------|-----------|-----------|-----------|
| Spools | NfcTags | SpoolId | CASCADE | CASCADE |
| Spools | Printers | Tray1SpoolId | SET NULL | CASCADE |
| Spools | Printers | Tray2SpoolId | SET NULL | CASCADE |
| Spools | Printers | Tray3SpoolId | SET NULL | CASCADE |
| Spools | Printers | Tray4SpoolId | SET NULL | CASCADE |
| Spools | Printers | ExtraSpoolId | SET NULL | CASCADE |
| Printers | PrintJobs | PrinterId | CASCADE | CASCADE |
| Spools | PrintJobs | SpoolId | SET NULL | CASCADE |
| Printers | PrinterSpoolHistory | PrinterId | CASCADE | CASCADE |
| Spools | PrinterSpoolHistory | SpoolId | SET NULL | CASCADE |

---

## EF Core Fluent API Configuration

```csharp
// Spools
modelBuilder.Entity<Spool>(entity =>
{
    entity.ToTable("Spools");
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Brand).IsRequired().HasMaxLength(200);
    entity.Property(e => e.Material).IsRequired().HasMaxLength(100);
    entity.Property(e => e.ColorName).IsRequired().HasMaxLength(200);
    entity.Property(e => e.ColorHex).IsRequired().HasMaxLength(10);
    entity.Property(e => e.InitialWeightG).IsRequired();
    entity.Property(e => e.CurrentWeightG).IsRequired();
    entity.HasIndex(e => e.IsActive);
    entity.HasIndex(e => e.Brand);
    entity.HasIndex(e => e.IsArchived);
});

// NfcTags
modelBuilder.Entity<NfcTag>(entity =>
{
    entity.ToTable("NfcTags");
    entity.HasKey(e => e.Id);
    entity.Property(e => e.TagUid).IsRequired().HasMaxLength(100);
    entity.HasOne(e => e.Spool)
          .WithMany(s => s.NfcTags)
          .HasForeignKey(e => e.SpoolId)
          .OnDelete(DeleteBehavior.Cascade);
    entity.HasIndex(e => e.TagUid).IsUnique();
    entity.HasIndex(e => e.SpoolId);
});

// Printers
modelBuilder.Entity<Printer>(entity =>
{
    entity.ToTable("Printers");
    entity.HasKey(e => e.Id);
    entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
    entity.Property(e => e.Brand).IsRequired().HasMaxLength(200);
    entity.Property(e => e.IpAddress).IsRequired().HasMaxLength(45);
    entity.Property(e => e.Protocol).IsRequired().HasMaxLength(50);
    entity.Property(e => e.HasAms).HasDefaultValue(false);

    // AMS tray spools
    entity.HasOne(e => e.Tray1Spool)
          .WithMany()
          .HasForeignKey(e => e.Tray1SpoolId)
          .OnDelete(DeleteBehavior.SetNull);
    entity.HasOne(e => e.Tray2Spool)
          .WithMany()
          .HasForeignKey(e => e.Tray2SpoolId)
          .OnDelete(DeleteBehavior.SetNull);
    entity.HasOne(e => e.Tray3Spool)
          .WithMany()
          .HasForeignKey(e => e.Tray3SpoolId)
          .OnDelete(DeleteBehavior.SetNull);
    entity.HasOne(e => e.Tray4Spool)
          .WithMany()
          .HasForeignKey(e => e.Tray4SpoolId)
          .OnDelete(DeleteBehavior.SetNull);

    // Non-AMS spool
    entity.HasOne(e => e.ExtraSpool)
          .WithMany()
          .HasForeignKey(e => e.ExtraSpoolId)
          .OnDelete(DeleteBehavior.SetNull);

    entity.HasIndex(e => e.HasAms);
    entity.HasIndex(e => e.SerialNumber);
});

// PrintJobs
modelBuilder.Entity<PrintJob>(entity =>
{
    entity.ToTable("PrintJobs");
    entity.HasKey(e => e.Id);
    entity.HasOne(e => e.Printer)
          .WithMany(p => p.PrintJobs)
          .HasForeignKey(e => e.PrinterId)
          .OnDelete(DeleteBehavior.Cascade);
    entity.HasOne(e => e.Spool)
          .WithMany(s => s.PrintJobs)
          .HasForeignKey(e => e.SpoolId)
          .OnDelete(DeleteBehavior.SetNull);
    entity.HasIndex(e => e.TaskId);
    entity.HasIndex(e => e.PrinterId);
    entity.HasIndex(e => e.SpoolId);
    entity.HasIndex(e => e.Status);
});

// PrinterSpoolHistory
modelBuilder.Entity<PrinterSpoolHistory>(entity =>
{
    entity.ToTable("PrinterSpoolHistory");
    entity.HasKey(e => e.Id);
    entity.HasOne(e => e.Printer)
          .WithMany()
          .HasForeignKey(e => e.PrinterId)
          .OnDelete(DeleteBehavior.Cascade);
    entity.HasOne(e => e.Spool)
          .WithMany()
          .HasForeignKey(e => e.SpoolId)
          .OnDelete(DeleteBehavior.SetNull);
    entity.HasIndex(e => e.PrinterId);
    entity.HasIndex(e => e.SpoolId);
    entity.HasIndex(e => e.AssignedAt);
});

// Activities
modelBuilder.Entity<Activity>(entity =>
{
    entity.ToTable("Activities");
    entity.HasKey(e => e.Id);
    entity.Property(e => e.ResourceId).HasMaxLength(100); // Soft reference, no FK
    entity.HasIndex(e => e.EventType);
    entity.HasIndex(e => e.ResourceId);
    entity.HasIndex(e => e.CreatedAt);
});

// AppSettings
modelBuilder.Entity<AppSetting>(entity =>
{
    entity.ToTable("AppSettings");
    entity.HasKey(e => e.Key);
    entity.Property(e => e.Key).HasMaxLength(100);
});
```

---

## Migration Plan

### Step 1: Create new tables (non-breaking)

```sql
-- Create PrinterSpoolHistory table
CREATE TABLE IF NOT EXISTS PrinterSpoolHistory (
    Id TEXT PRIMARY KEY,
    PrinterId TEXT NOT NULL REFERENCES Printers(Id) ON DELETE CASCADE,
    SpoolId TEXT REFERENCES Spools(Id) ON DELETE SET NULL,
    SlotIndex INTEGER,
    AssignedAt TEXT NOT NULL,
    RemovedAt TEXT,
    Source TEXT
);

CREATE INDEX IX_PrinterSpoolHistory_PrinterId ON PrinterSpoolHistory(PrinterId);
CREATE INDEX IX_PrinterSpoolHistory_SpoolId ON PrinterSpoolHistory(SpoolId);
CREATE INDEX IX_PrinterSpoolHistory_AssignedAt ON PrinterSpoolHistory(AssignedAt);
```

### Step 2: Add new columns to Printers (non-breaking)

```sql
-- Add tray spool columns if not exist
ALTER TABLE Printers ADD COLUMN Tray1SpoolId TEXT REFERENCES Spools(Id) ON DELETE SET NULL;
ALTER TABLE Printers ADD COLUMN Tray2SpoolId TEXT REFERENCES Spools(Id) ON DELETE SET NULL;
ALTER TABLE Printers ADD COLUMN Tray3SpoolId TEXT REFERENCES Spools(Id) ON DELETE SET NULL;
ALTER TABLE Printers ADD COLUMN Tray4SpoolId TEXT REFERENCES Spools(Id) ON DELETE SET NULL;
ALTER TABLE Printers ADD COLUMN ExtraSpoolId TEXT REFERENCES Spools(Id) ON DELETE SET NULL;

CREATE INDEX IX_Printers_HasAms ON Printers(HasAms);
CREATE INDEX IX_Printers_SerialNumber ON Printers(SerialNumber);
```

### Step 3: Add indexes to existing tables

```sql
CREATE INDEX IX_PrintJobs_TaskId ON PrintJobs(TaskId);
CREATE INDEX IX_PrintJobs_PrinterId ON PrintJobs(PrinterId);
CREATE INDEX IX_PrintJobs_SpoolId ON PrintJobs(SpoolId);
CREATE INDEX IX_Activities_EventType ON Activities(EventType);
CREATE INDEX IX_Activities_ResourceId ON Activities(ResourceId);
CREATE INDEX IX_Activities_CreatedAt ON Activities(CreatedAt);
CREATE INDEX IX_Spools_IsActive ON Spools(IsActive);
CREATE INDEX IX_Spools_Brand ON Spools(Brand);
CREATE INDEX IX_NfcTags_TagUid ON NfcTags(TagUid);
CREATE INDEX IX_NfcTags_SpoolId ON NfcTags(SpoolId);
```

### Step 4: Migrate data (when ready)

```sql
-- Migrate existing spool assignments from old schema
-- (depends on what the old schema looks like)
INSERT INTO PrinterSpoolHistory (Id, PrinterId, SpoolId, SlotIndex, AssignedAt, Source)
SELECT 
    lower(hex(randomblob(16))),
    p.Id,
    p.Tray1SpoolId,
    0,
    datetime('now'),
    'migration'
FROM Printers p
WHERE p.Tray1SpoolId IS NOT NULL;
```

### Step 5: Remove old columns (breaking — do this last)

```sql
-- Only after all code is updated to use new columns
-- ALTER TABLE Printers DROP COLUMN OldSpoolColumn;
```

---

## Backward Compatibility Notes

1. **MQTT**: The `Tray1SpoolId` through `Tray4SpoolId` columns are preserved with the same names. MQTT code continues to work.
2. **API**: Existing API contracts remain compatible. New fields are additive.
3. **Frontend**: The `PrinterCard` and detail page already use `Tray1-4SpoolId` fields.
4. **PrintJobs.SpoolId**: Still exists for backward compatibility. New code should resolve spool from printer mapping instead.
