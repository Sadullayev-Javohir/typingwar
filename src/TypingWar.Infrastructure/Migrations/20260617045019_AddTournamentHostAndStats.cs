using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TypingWar.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTournamentHostAndStats : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "HostId",
                table: "Tournaments",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<double>(
                name: "BestAccuracy",
                table: "TournamentPlayers",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "BestWpm",
                table: "TournamentPlayers",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "EliminatedRound",
                table: "TournamentPlayers",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<double>(
                name: "Player1Accuracy",
                table: "TournamentMatches",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Player1Wpm",
                table: "TournamentMatches",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Player2Accuracy",
                table: "TournamentMatches",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "Player2Wpm",
                table: "TournamentMatches",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HostId",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "BestAccuracy",
                table: "TournamentPlayers");

            migrationBuilder.DropColumn(
                name: "BestWpm",
                table: "TournamentPlayers");

            migrationBuilder.DropColumn(
                name: "EliminatedRound",
                table: "TournamentPlayers");

            migrationBuilder.DropColumn(
                name: "Player1Accuracy",
                table: "TournamentMatches");

            migrationBuilder.DropColumn(
                name: "Player1Wpm",
                table: "TournamentMatches");

            migrationBuilder.DropColumn(
                name: "Player2Accuracy",
                table: "TournamentMatches");

            migrationBuilder.DropColumn(
                name: "Player2Wpm",
                table: "TournamentMatches");
        }
    }
}
