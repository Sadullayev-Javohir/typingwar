using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentPrivacyAndFinishedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "FinishedAt",
                table: "Tournaments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrivate",
                table: "Tournaments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "Tournaments",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FinishedAt",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "IsPrivate",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "Tournaments");
        }
    }
}
