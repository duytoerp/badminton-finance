using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Multiplier",
                table: "BadmintonSessionParticipant",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 1.0m);

            migrationBuilder.AddColumn<Guid>(
                name: "PricingTemplateId",
                table: "BadmintonSession",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Gender",
                table: "BadmintonPlayer",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SkillLevel",
                table: "BadmintonPlayer",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PricingTemplate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingTemplate", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PricingTemplateRule",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PricingTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Gender = table.Column<int>(type: "int", nullable: true),
                    SkillLevel = table.Column<int>(type: "int", nullable: true),
                    Multiplier = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingTemplateRule", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PricingTemplateRule_PricingTemplate_PricingTemplateId",
                        column: x => x.PricingTemplateId,
                        principalTable: "PricingTemplate",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonSession_PricingTemplateId",
                table: "BadmintonSession",
                column: "PricingTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_PricingTemplate_IsDefault_IsActive",
                table: "PricingTemplate",
                columns: new[] { "IsDefault", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_PricingTemplateRule_PricingTemplateId_Gender_SkillLevel",
                table: "PricingTemplateRule",
                columns: new[] { "PricingTemplateId", "Gender", "SkillLevel" });

            migrationBuilder.AddForeignKey(
                name: "FK_BadmintonSession_PricingTemplate_PricingTemplateId",
                table: "BadmintonSession",
                column: "PricingTemplateId",
                principalTable: "PricingTemplate",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BadmintonSession_PricingTemplate_PricingTemplateId",
                table: "BadmintonSession");

            migrationBuilder.DropTable(
                name: "PricingTemplateRule");

            migrationBuilder.DropTable(
                name: "PricingTemplate");

            migrationBuilder.DropIndex(
                name: "IX_BadmintonSession_PricingTemplateId",
                table: "BadmintonSession");

            migrationBuilder.DropColumn(
                name: "Multiplier",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropColumn(
                name: "PricingTemplateId",
                table: "BadmintonSession");

            migrationBuilder.DropColumn(
                name: "Gender",
                table: "BadmintonPlayer");

            migrationBuilder.DropColumn(
                name: "SkillLevel",
                table: "BadmintonPlayer");
        }
    }
}
