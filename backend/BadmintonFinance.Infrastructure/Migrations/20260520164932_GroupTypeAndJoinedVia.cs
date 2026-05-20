using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class GroupTypeAndJoinedVia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "JoinedViaGroupId",
                table: "BadmintonSessionParticipant",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "JoinedViaGroupName",
                table: "BadmintonSessionParticipant",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "JoinedViaGroupType",
                table: "BadmintonSessionParticipant",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GroupType",
                table: "BadmintonPlayerGroup",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonSessionParticipant_JoinedViaGroupId",
                table: "BadmintonSessionParticipant",
                column: "JoinedViaGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_BadmintonSessionParticipant_BadmintonPlayerGroup_JoinedViaGroupId",
                table: "BadmintonSessionParticipant",
                column: "JoinedViaGroupId",
                principalTable: "BadmintonPlayerGroup",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BadmintonSessionParticipant_BadmintonPlayerGroup_JoinedViaGroupId",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropIndex(
                name: "IX_BadmintonSessionParticipant_JoinedViaGroupId",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropColumn(
                name: "JoinedViaGroupId",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropColumn(
                name: "JoinedViaGroupName",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropColumn(
                name: "JoinedViaGroupType",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropColumn(
                name: "GroupType",
                table: "BadmintonPlayerGroup");
        }
    }
}
