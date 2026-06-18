using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBackgroundAndPanelSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Standartlar frontend DEFAULTS bilan mos: fon "nextjs", panellar/gepard yoniq
            migrationBuilder.AddColumn<string>(
                name: "Background",
                table: "UserSettings",
                type: "text",
                nullable: false,
                defaultValue: "nextjs");

            migrationBuilder.AddColumn<bool>(
                name: "ShowCheetah",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowLiveAcc",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowLiveTimer",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowStatsPanel",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Background",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowCheetah",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowLiveAcc",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowLiveTimer",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowStatsPanel",
                table: "UserSettings");
        }
    }
}
