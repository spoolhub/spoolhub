using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSpoolProfile : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SpoolProfiles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Brand = table.Column<string>(type: "TEXT", nullable: false),
                    Material = table.Column<string>(type: "TEXT", nullable: false),
                    ColorName = table.Column<string>(type: "TEXT", nullable: false),
                    ColorHex = table.Column<string>(type: "TEXT", nullable: false),
                    InitialWeightG = table.Column<float>(type: "REAL", nullable: false),
                    SpoolWeightG = table.Column<float>(type: "REAL", nullable: false),
                    LowStockThresholdG = table.Column<float>(type: "REAL", nullable: false),
                    Density = table.Column<float>(type: "REAL", nullable: true),
                    DiameterTolerance = table.Column<float>(type: "REAL", nullable: true),
                    ExtruderMin = table.Column<int>(type: "INTEGER", nullable: true),
                    ExtruderMax = table.Column<int>(type: "INTEGER", nullable: true),
                    BedMin = table.Column<int>(type: "INTEGER", nullable: true),
                    BedMax = table.Column<int>(type: "INTEGER", nullable: true),
                    Price = table.Column<decimal>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpoolProfiles", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "SpoolProfiles");
        }
    }
}
