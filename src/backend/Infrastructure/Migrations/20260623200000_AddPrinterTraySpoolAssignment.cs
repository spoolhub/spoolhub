using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrinterTraySpoolAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "Tray1SpoolId",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "Tray2SpoolId",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "Tray3SpoolId",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "Tray4SpoolId",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExtraSpoolId",
                table: "Printers",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Tray1SpoolId", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2SpoolId", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3SpoolId", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4SpoolId", table: "Printers");
            migrationBuilder.DropColumn(name: "ExtraSpoolId", table: "Printers");
        }
    }
}
