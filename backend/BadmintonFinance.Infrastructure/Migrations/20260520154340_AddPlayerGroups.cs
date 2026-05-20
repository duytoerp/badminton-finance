using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BadmintonPlayerGroup",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadmintonPlayerGroup", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BadmintonPlayerGroupMember",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlayerGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlayerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadmintonPlayerGroupMember", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BadmintonPlayerGroupMember_BadmintonPlayerGroup_PlayerGroupId",
                        column: x => x.PlayerGroupId,
                        principalTable: "BadmintonPlayerGroup",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BadmintonPlayerGroupMember_BadmintonPlayer_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "BadmintonPlayer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BadmintonSessionGroup",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SessionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlayerGroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GroupNameSnapshot = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    MembersTotal = table.Column<int>(type: "int", nullable: false),
                    MembersAdded = table.Column<int>(type: "int", nullable: false),
                    MembersSkippedDuplicate = table.Column<int>(type: "int", nullable: false),
                    MembersSkippedInactive = table.Column<int>(type: "int", nullable: false),
                    AppliedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AppliedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BadmintonSessionGroup", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BadmintonSessionGroup_BadmintonPlayerGroup_PlayerGroupId",
                        column: x => x.PlayerGroupId,
                        principalTable: "BadmintonPlayerGroup",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BadmintonSessionGroup_BadmintonSession_SessionId",
                        column: x => x.SessionId,
                        principalTable: "BadmintonSession",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonPlayerGroup_Name",
                table: "BadmintonPlayerGroup",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonPlayerGroupMember_PlayerGroupId_PlayerId",
                table: "BadmintonPlayerGroupMember",
                columns: new[] { "PlayerGroupId", "PlayerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonPlayerGroupMember_PlayerId",
                table: "BadmintonPlayerGroupMember",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonSessionGroup_PlayerGroupId",
                table: "BadmintonSessionGroup",
                column: "PlayerGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonSessionGroup_SessionId_PlayerGroupId",
                table: "BadmintonSessionGroup",
                columns: new[] { "SessionId", "PlayerGroupId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BadmintonPlayerGroupMember");

            migrationBuilder.DropTable(
                name: "BadmintonSessionGroup");

            migrationBuilder.DropTable(
                name: "BadmintonPlayerGroup");
        }
    }
}
