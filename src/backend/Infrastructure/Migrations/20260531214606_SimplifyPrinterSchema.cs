using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyPrinterSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // EF Core's migrationBuilder.DropColumn throws NotSupportedException on SQLite.
            // Use raw SQL instead — ALTER TABLE DROP COLUMN is supported in SQLite 3.35.0+.
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"AccessCode\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"AmsSlotCount\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"CloudEmail\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"CloudPassword\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"IsActive\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"LastSeenAt\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"Notes\";");
            migrationBuilder.Sql("ALTER TABLE \"Printers\" DROP COLUMN \"Port\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccessCode",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AmsSlotCount",
                table: "Printers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CloudEmail",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CloudPassword",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Printers",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Printers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Port",
                table: "Printers",
                type: "INTEGER",
                nullable: true);
        }
    }
}
