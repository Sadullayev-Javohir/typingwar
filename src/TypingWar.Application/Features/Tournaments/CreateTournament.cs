using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Yangi turnir yaratadi (Registration holatida). Settings — poyga matni sozlamalari (JSON).
/// IsPrivate=true bo'lsa Password majburiy (xeshlanadi).</summary>
public record CreateTournamentCommand(
    string Name, int Capacity, DateTime StartAt, string? Settings,
    bool IsPrivate, string? Password) : IRequest<Guid>;

public class CreateTournamentCommandHandler : IRequestHandler<CreateTournamentCommand, Guid>
{
    /// <summary>Turnir parolining ruxsat etilgan uzunligi.</summary>
    public const int MinPasswordLength = 4;
    public const int MaxPasswordLength = 64;

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IPasswordHashService _passwordHasher;

    public CreateTournamentCommandHandler(
        IApplicationDbContext db, ICurrentUserService currentUser, IPasswordHashService passwordHasher)
    {
        _db = db;
        _currentUser = currentUser;
        _passwordHasher = passwordHasher;
    }

    public async Task<Guid> Handle(CreateTournamentCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Turnir yaratish uchun tizimga kiring.");

        if (!TournamentBracket.IsValidCapacity(request.Capacity))
            throw new InvalidOperationException("Sig'im 4, 8, 16, 32 yoki 64 bo'lishi kerak.");

        var name = string.IsNullOrWhiteSpace(request.Name) ? "Turnir" : request.Name.Trim();
        if (name.Length > 80) name = name[..80];

        // Shaxsiy turnir — parol majburiy, xeshlanadi (ochiq matn saqlanmaydi)
        string? passwordHash = null;
        if (request.IsPrivate)
        {
            var pw = request.Password ?? string.Empty;
            if (pw.Length < MinPasswordLength || pw.Length > MaxPasswordLength)
                throw new InvalidOperationException(
                    $"Shaxsiy turnir paroli {MinPasswordLength}–{MaxPasswordLength} belgidan iborat bo'lishi kerak.");
            passwordHash = _passwordHasher.Hash(pw);
        }

        var tournament = new Tournament
        {
            Name = name,
            HostId = uid,
            Capacity = request.Capacity,
            StartAt = request.StartAt.ToUniversalTime(),
            Settings = string.IsNullOrWhiteSpace(request.Settings) ? "{}" : request.Settings,
            Status = Domain.Enums.TournamentStatus.Registration,
            IsPrivate = request.IsPrivate,
            PasswordHash = passwordHash
        };
        _db.Tournaments.Add(tournament);
        await _db.SaveChangesAsync(cancellationToken);
        return tournament.Id;
    }
}
