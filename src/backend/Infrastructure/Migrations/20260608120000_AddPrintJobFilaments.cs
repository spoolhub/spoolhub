using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrintJobFilaments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PrintJobFilaments",
                columns: table => new
                {
                    Id        = table.Column<Guid>(type: "TEXT", nullable: false),
                    PrintJobId = table.Column<Guid>(type: "TEXT", nullable: false),
                    SpoolId   = table.Column<Guid>(type: "TEXT", nullable: true),
                    ColorName = table.Column<string>(type: "TEXT", nullable: true),
                    ColorHex  = table.Column<string>(type: "TEXT", nullable: true),
                    Material  = table.Column<string>(type: "TEXT", nullable: true),
                    GramsUsed = table.Column<float>(type: "REAL", nullable: false),
                    SlotIndex = table.Column<int>(type: "INTEGER", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrintJobFilaments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PrintJobFilaments_PrintJobs_PrintJobId",
                        column: x => x.PrintJobId,
                        principalTable: "PrintJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PrintJobFilaments_PrintJobId",
                table: "PrintJobFilaments",
                column: "PrintJobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PrintJobFilaments");
        }
    }
}
