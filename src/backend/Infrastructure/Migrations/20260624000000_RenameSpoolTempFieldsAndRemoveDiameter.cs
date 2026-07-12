using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameSpoolTempFieldsAndRemoveDiameter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // EF Core migrationBuilder.DropColumn throws NotSupportedException on SQLite.
            // Use raw SQL instead — ALTER TABLE DROP COLUMN is supported in SQLite 3.35.0+.
            migrationBuilder.Sql("ALTER TABLE \"Spools\" DROP COLUMN \"DiameterMm\";");

            migrationBuilder.RenameColumn(
                name: "PrintTempMin",
                table: "Spools",
                newName: "ExtruderMin");

            migrationBuilder.RenameColumn(
                name: "PrintTempMax",
                table: "Spools",
                newName: "ExtruderMax");

            migrationBuilder.RenameColumn(
                name: "BedTempMin",
                table: "Spools",
                newName: "BedMin");

            migrationBuilder.RenameColumn(
                name: "BedTempMax",
                table: "Spools",
                newName: "BedMax");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ExtruderMin",
                table: "Spools",
                newName: "PrintTempMin");

            migrationBuilder.RenameColumn(
                name: "ExtruderMax",
                table: "Spools",
                newName: "PrintTempMax");

            migrationBuilder.RenameColumn(
                name: "BedMin",
                table: "Spools",
                newName: "BedTempMin");

            migrationBuilder.RenameColumn(
                name: "BedMax",
                table: "Spools",
                newName: "BedTempMax");

            migrationBuilder.AddColumn<float>(
                name: "DiameterMm",
                table: "Spools",
                type: "REAL",
                nullable: false,
                defaultValue: 1.75f);
        }
    }
}
