using Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(FilamentDbContext))]
    [Migration("20260715170000_AddExtraSpoolMqttFields")]
    /// <inheritdoc />
    public class AddExtraSpoolMqttFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ExtraSpoolOccupied",
                table: "Printers",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExtraSpoolRemainPct",
                table: "Printers",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ExtraSpoolOccupied", table: "Printers");
            migrationBuilder.DropColumn(name: "ExtraSpoolRemainPct", table: "Printers");
        }
    }
}
