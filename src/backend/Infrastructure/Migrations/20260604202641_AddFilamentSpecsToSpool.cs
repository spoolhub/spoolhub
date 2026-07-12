using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFilamentSpecsToSpool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BedTempMax",
                table: "Spools",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BedTempMin",
                table: "Spools",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<float>(
                name: "Density",
                table: "Spools",
                type: "REAL",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrintTempMax",
                table: "Spools",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PrintTempMin",
                table: "Spools",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BedTempMax",
                table: "Spools");

            migrationBuilder.DropColumn(
                name: "BedTempMin",
                table: "Spools");

            migrationBuilder.DropColumn(
                name: "Density",
                table: "Spools");

            migrationBuilder.DropColumn(
                name: "PrintTempMax",
                table: "Spools");

            migrationBuilder.DropColumn(
                name: "PrintTempMin",
                table: "Spools");
        }
    }
}
