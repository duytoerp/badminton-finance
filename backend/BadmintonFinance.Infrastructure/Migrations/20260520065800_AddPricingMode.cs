using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FixedAmount",
                table: "PricingTemplateRule",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "Mode",
                table: "PricingTemplate",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "FixedAmount",
                table: "BadmintonSessionParticipant",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "PricingMode",
                table: "BadmintonSession",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FixedAmount",
                table: "PricingTemplateRule");

            migrationBuilder.DropColumn(
                name: "Mode",
                table: "PricingTemplate");

            migrationBuilder.DropColumn(
                name: "FixedAmount",
                table: "BadmintonSessionParticipant");

            migrationBuilder.DropColumn(
                name: "PricingMode",
                table: "BadmintonSession");
        }
    }
}
