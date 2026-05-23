using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMatchHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BadmintonMatchHistory",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MatchNumber = table.Column<int>(type: "int", nullable: false),
                    Team1PlayerIds = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Team2PlayerIds = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Team1Score = table.Column<int>(type: "int", nullable: true),
                    Team2Score = table.Column<int>(type: "int", nullable: true),
                    PlayedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadmintonMatchHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BadmintonMatchHistory_BadmintonSession_SessionId",
                        column: x => x.SessionId,
                        principalTable: "BadmintonSession",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonMatchHistory_SessionId_MatchNumber",
                table: "BadmintonMatchHistory",
                columns: new[] { "SessionId", "MatchNumber" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BadmintonMatchHistory");
        }
    }
}
