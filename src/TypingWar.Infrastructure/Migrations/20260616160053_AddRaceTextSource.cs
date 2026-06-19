using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRaceTextSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "RaceTexts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Source",
                table: "RaceTexts");
        }
    }
}
