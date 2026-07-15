using Infrastructure.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    [DbContext(typeof(FilamentDbContext))]
    [Migration("20260715180000_AddPrinterTrayMqttHints")]
    public class AddPrinterTrayMqttHints : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(name: "Tray1MqttMaterial", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray1MqttColorName", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray1MqttColorHex", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray1MqttBrand", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray2MqttMaterial", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray2MqttColorName", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray2MqttColorHex", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray2MqttBrand", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray3MqttMaterial", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray3MqttColorName", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray3MqttColorHex", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray3MqttBrand", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray4MqttMaterial", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray4MqttColorName", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray4MqttColorHex", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "Tray4MqttBrand", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ExtraMqttMaterial", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ExtraMqttColorName", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ExtraMqttColorHex", table: "Printers", type: "TEXT", nullable: true);
            migrationBuilder.AddColumn<string>(name: "ExtraMqttBrand", table: "Printers", type: "TEXT", nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "Tray1MqttMaterial", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray1MqttColorName", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray1MqttColorHex", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray1MqttBrand", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2MqttMaterial", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2MqttColorName", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2MqttColorHex", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray2MqttBrand", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3MqttMaterial", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3MqttColorName", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3MqttColorHex", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray3MqttBrand", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4MqttMaterial", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4MqttColorName", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4MqttColorHex", table: "Printers");
            migrationBuilder.DropColumn(name: "Tray4MqttBrand", table: "Printers");
            migrationBuilder.DropColumn(name: "ExtraMqttMaterial", table: "Printers");
            migrationBuilder.DropColumn(name: "ExtraMqttColorName", table: "Printers");
            migrationBuilder.DropColumn(name: "ExtraMqttColorHex", table: "Printers");
            migrationBuilder.DropColumn(name: "ExtraMqttBrand", table: "Printers");
        }
    }
}
