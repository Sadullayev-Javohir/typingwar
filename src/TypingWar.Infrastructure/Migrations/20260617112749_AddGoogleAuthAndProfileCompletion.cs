using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddGoogleAuthAndProfileCompletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GoogleId",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ProfileCompleted",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Mavjud foydalanuvchilar (username + hudud allaqachon bor) — profil to'liq deb belgilanadi,
            // shunda keyin Google bilan kirganda CompleteProfile sahifasiga tushib qolmaydi.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"ProfileCompleted\" = TRUE WHERE \"RegionCode\" IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GoogleId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfileCompleted",
                table: "Users");
        }
    }
}
