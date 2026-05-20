using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonFinance.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCourtBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BookingId",
                table: "BadmintonSession",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CourtBooking",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CourtId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RecurrenceType = table.Column<int>(type: "int", nullable: false),
                    Pattern = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    FromDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ToDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    EndTime = table.Column<TimeSpan>(type: "time", nullable: false),
                    CourtCount = table.Column<int>(type: "int", nullable: false),
                    PricingTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    GeneratedSessionCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CourtBooking", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CourtBooking_BadmintonCourt_CourtId",
                        column: x => x.CourtId,
                        principalTable: "BadmintonCourt",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CourtBooking_PricingTemplate_PricingTemplateId",
                        column: x => x.PricingTemplateId,
                        principalTable: "PricingTemplate",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BadmintonSession_BookingId",
                table: "BadmintonSession",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_CourtBooking_CourtId_FromDate",
                table: "CourtBooking",
                columns: new[] { "CourtId", "FromDate" });

            migrationBuilder.CreateIndex(
                name: "IX_CourtBooking_PricingTemplateId",
                table: "CourtBooking",
                column: "PricingTemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_BadmintonSession_CourtBooking_BookingId",
                table: "BadmintonSession",
                column: "BookingId",
                principalTable: "CourtBooking",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BadmintonSession_CourtBooking_BookingId",
                table: "BadmintonSession");

            migrationBuilder.DropTable(
                name: "CourtBooking");

            migrationBuilder.DropIndex(
                name: "IX_BadmintonSession_BookingId",
                table: "BadmintonSession");

            migrationBuilder.DropColumn(
                name: "BookingId",
                table: "BadmintonSession");
        }
    }
}
