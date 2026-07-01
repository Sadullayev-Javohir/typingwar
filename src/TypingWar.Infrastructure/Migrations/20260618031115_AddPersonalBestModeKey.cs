using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPersonalBestModeKey : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_PersonalBests",
                table: "PersonalBests");

            migrationBuilder.AddColumn<string>(
                name: "ModeKey",
                table: "RaceResults",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModeKey",
                table: "PersonalBests",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "");

            // Mavjud yozuvlar — vaqt rejimi bo'yicha edi: ModeKey = "time:{soniya}".
            // (Yangi PK qo'yilishidan OLDIN to'ldirilishi shart, aks holda bo'sh ModeKey lar to'qnashadi.)
            migrationBuilder.Sql(
                "UPDATE \"PersonalBests\" SET \"ModeKey\" = 'time:' || \"TimeMode\"::text WHERE \"ModeKey\" = '';");
            migrationBuilder.Sql(
                "UPDATE \"RaceResults\" SET \"ModeKey\" = 'time:' || \"TimeMode\"::text WHERE \"ModeKey\" IS NULL;");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PersonalBests",
                table: "PersonalBests",
                columns: new[] { "UserId", "ModeKey" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_PersonalBests",
                table: "PersonalBests");

            migrationBuilder.DropColumn(
                name: "ModeKey",
                table: "RaceResults");

            migrationBuilder.DropColumn(
                name: "ModeKey",
                table: "PersonalBests");

            migrationBuilder.AddPrimaryKey(
                name: "PK_PersonalBests",
                table: "PersonalBests",
                columns: new[] { "UserId", "TimeMode" });
        }
    }
}
