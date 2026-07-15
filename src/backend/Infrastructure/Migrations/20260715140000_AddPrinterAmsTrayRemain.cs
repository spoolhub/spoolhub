using Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(FilamentDbContext))]
    [Migration("20260715140000_AddPrinterAmsTrayRemain")]
    /// <inheritdoc />
    public class AddPrinterAmsTrayRemain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Tray1RemainPct",
                table: "Printers",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tray2RemainPct",
                table: "Printers",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tray3RemainPct",
                table: "Printers",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tray4RemainPct",
                table: "Printers",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Tray1RemainPct", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2RemainPct", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3RemainPct", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4RemainPct", table: "Printers");
        }
    }
}
