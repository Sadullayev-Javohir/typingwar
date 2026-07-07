using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShowKeyboardSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ShowKeyboard",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ShowKeyboard",
                table: "UserSettings");
        }
    }
}
