using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchPlanHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BadmintonMatchPlanHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Rounds = table.Column<int>(type: "int", nullable: false),
                    CourtCount = table.Column<int>(type: "int", nullable: false),
                    SkillMode = table.Column<int>(type: "int", nullable: false),
                    OnlyCheckedIn = table.Column<bool>(type: "bit", nullable: false),
                    PlayerCount = table.Column<int>(type: "int", nullable: false),
                    CheckedInCount = table.Column<int>(type: "int", nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadmintonMatchPlanHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BadmintonMatchPlanHistory_BadmintonSession_SessionId",
                        column: x => x.SessionId,
                        principalTable: "BadmintonSession",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonMatchPlanHistory_SessionId_GeneratedAt",
                table: "BadmintonMatchPlanHistory",
                columns: new[] { "SessionId", "GeneratedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BadmintonMatchPlanHistory");
        }
    }
}
