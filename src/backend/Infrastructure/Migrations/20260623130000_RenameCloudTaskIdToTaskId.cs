using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RenameCloudTaskIdToTaskId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS IX_PrintJobs_CloudTaskId;");

            migrationBuilder.RenameColumn(
                name: "CloudTaskId",
                table: "PrintJobs",
                newName: "TaskId");

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS IX_PrintJobs_TaskId " +
                "ON PrintJobs(TaskId) WHERE TaskId IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP INDEX IF EXISTS IX_PrintJobs_TaskId;");

            migrationBuilder.RenameColumn(
                name: "TaskId",
                table: "PrintJobs",
                newName: "CloudTaskId");

            migrationBuilder.Sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS IX_PrintJobs_CloudTaskId " +
                "ON PrintJobs(CloudTaskId) WHERE CloudTaskId IS NOT NULL;");
        }
    }
}
