using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DropLastReportedGramsUsed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PrintJobs\" DROP COLUMN \"LastReportedGramsUsed\";");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PrintJobs\" ADD COLUMN \"LastReportedGramsUsed\" REAL NOT NULL DEFAULT 0;");
        }
    }
}
