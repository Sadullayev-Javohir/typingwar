using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBoldTextSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "BoldText",
                table: "UserSettings",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BoldText",
                table: "UserSettings");
        }
    }
}
