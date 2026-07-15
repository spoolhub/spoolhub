using Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(FilamentDbContext))]
    [Migration("20260715160000_AddBambuTagUidAndTrayOccupied")]
    /// <inheritdoc />
    public class AddBambuTagUidAndTrayOccupied : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BambuTagUid",
                table: "Spools",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Spools_BambuTagUid",
                table: "Spools",
                column: "BambuTagUid",
                unique: true);

            migrationBuilder.AddColumn<bool>(
                name: "Tray1Occupied",
                table: "Printers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Tray2Occupied",
                table: "Printers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Tray3Occupied",
                table: "Printers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Tray4Occupied",
                table: "Printers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(name: "IX_Spools_BambuTagUid", table: "Spools");
            migrationBuilder.DropColumn(name: "BambuTagUid", table: "Spools");
            migrationBuilder.DropColumn(name: "Tray1Occupied", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2Occupied", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3Occupied", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4Occupied", table: "Printers");
        }
    }
}
