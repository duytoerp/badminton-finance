using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchInProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FinishedAt",
                table: "BadmintonMatchHistory",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StartedAt",
                table: "BadmintonMatchHistory",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "BadmintonMatchHistory",
                type: "int",
                nullable: false,
                defaultValue: 1);  // existing rows are Finished (1)

            // Backfill FinishedAt for legacy rows from PlayedAt.
            migrationBuilder.Sql("UPDATE [BadmintonMatchHistory] SET [FinishedAt] = [PlayedAt], [StartedAt] = [PlayedAt] WHERE [FinishedAt] IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FinishedAt",
                table: "BadmintonMatchHistory");

            migrationBuilder.DropColumn(
                name: "StartedAt",
                table: "BadmintonMatchHistory");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "BadmintonMatchHistory");
        }
    }
}
