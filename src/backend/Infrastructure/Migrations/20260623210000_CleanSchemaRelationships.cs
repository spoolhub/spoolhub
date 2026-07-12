using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class CleanSchemaRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // AmsSlot and PrinterId on Spools are intentionally left on existing databases
            // (SQLite does not support DROP COLUMN via EF Core migrations). The columns are
            // unused by the model; new databases created from scratch will not have them.

            // Add indexes for Printer tray columns (FK constraints omitted — EF Core SQLite
            // throws NotSupportedException for AddForeignKey on existing tables).
            migrationBuilder.CreateIndex(
                name: "IX_Printers_Tray1SpoolId",
                table: "Printers",
                column: "Tray1SpoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Printers_Tray2SpoolId",
                table: "Printers",
                column: "Tray2SpoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Printers_Tray3SpoolId",
                table: "Printers",
                column: "Tray3SpoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Printers_Tray4SpoolId",
                table: "Printers",
                column: "Tray4SpoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Printers_ExtraSpoolId",
                table: "Printers",
                column: "ExtraSpoolId");

            migrationBuilder.CreateIndex(
                name: "IX_PrintJobFilaments_SpoolId",
                table: "PrintJobFilaments",
                column: "SpoolId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_PrintJobFilaments_Spools_SpoolId", table: "PrintJobFilaments");
            migrationBuilder.DropIndex(name: "IX_PrintJobFilaments_SpoolId", table: "PrintJobFilaments");

            migrationBuilder.DropForeignKey(name: "FK_Printers_Spools_ExtraSpoolId", table: "Printers");
            migrationBuilder.DropIndex(name: "IX_Printers_ExtraSpoolId", table: "Printers");
            migrationBuilder.DropForeignKey(name: "FK_Printers_Spools_Tray4SpoolId", table: "Printers");
            migrationBuilder.DropIndex(name: "IX_Printers_Tray4SpoolId", table: "Printers");
            migrationBuilder.DropForeignKey(name: "FK_Printers_Spools_Tray3SpoolId", table: "Printers");
            migrationBuilder.DropIndex(name: "IX_Printers_Tray3SpoolId", table: "Printers");
            migrationBuilder.DropForeignKey(name: "FK_Printers_Spools_Tray2SpoolId", table: "Printers");
            migrationBuilder.DropIndex(name: "IX_Printers_Tray2SpoolId", table: "Printers");
            migrationBuilder.DropForeignKey(name: "FK_Printers_Spools_Tray1SpoolId", table: "Printers");
            migrationBuilder.DropIndex(name: "IX_Printers_Tray1SpoolId", table: "Printers");

            migrationBuilder.AddColumn<Guid>(
                name: "PrinterId",
                table: "Spools",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AmsSlot",
                table: "Spools",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Spools_PrinterId",
                table: "Spools",
                column: "PrinterId");

            migrationBuilder.AddForeignKey(
                name: "FK_Spools_Printers_PrinterId",
                table: "Spools",
                column: "PrinterId",
                principalTable: "Printers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
