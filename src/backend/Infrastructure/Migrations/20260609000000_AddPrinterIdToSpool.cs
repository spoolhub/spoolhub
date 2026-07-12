using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrinterIdToSpool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PrinterId",
                table: "Spools",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Spools_PrinterId",
                table: "Spools",
                column: "PrinterId");

            // FK_Spools_Printers_PrinterId omitted — EF Core SQLite throws NotSupportedException
            // for AddForeignKey. The relationship is enforced at the application layer.
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Spools_Printers_PrinterId",
                table: "Spools");

            migrationBuilder.DropIndex(
                name: "IX_Spools_PrinterId",
                table: "Spools");

            migrationBuilder.DropColumn(
                name: "PrinterId",
                table: "Spools");
        }
    }
}
