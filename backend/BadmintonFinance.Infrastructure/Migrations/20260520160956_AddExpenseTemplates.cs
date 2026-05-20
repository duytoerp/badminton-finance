using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExpenseTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ExpenseTemplateId",
                table: "CourtBooking",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExpenseTemplate",
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
                    table.PrimaryKey("PK_ExpenseTemplate", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ExpenseTemplateItem",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExpenseTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CalculationType = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExpenseTemplateItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExpenseTemplateItem_ExpenseTemplate_ExpenseTemplateId",
                        column: x => x.ExpenseTemplateId,
                        principalTable: "ExpenseTemplate",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CourtBooking_ExpenseTemplateId",
                table: "CourtBooking",
                column: "ExpenseTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTemplate_IsDefault_IsActive",
                table: "ExpenseTemplate",
                columns: new[] { "IsDefault", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_ExpenseTemplateItem_ExpenseTemplateId_SortOrder",
                table: "ExpenseTemplateItem",
                columns: new[] { "ExpenseTemplateId", "SortOrder" });

            migrationBuilder.AddForeignKey(
                name: "FK_CourtBooking_ExpenseTemplate_ExpenseTemplateId",
                table: "CourtBooking",
                column: "ExpenseTemplateId",
                principalTable: "ExpenseTemplate",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CourtBooking_ExpenseTemplate_ExpenseTemplateId",
                table: "CourtBooking");

            migrationBuilder.DropTable(
                name: "ExpenseTemplateItem");

            migrationBuilder.DropTable(
                name: "ExpenseTemplate");

            migrationBuilder.DropIndex(
                name: "IX_CourtBooking_ExpenseTemplateId",
                table: "CourtBooking");

            migrationBuilder.DropColumn(
                name: "ExpenseTemplateId",
                table: "CourtBooking");
        }
    }
}
