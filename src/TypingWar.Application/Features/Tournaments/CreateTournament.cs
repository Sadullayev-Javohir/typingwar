using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Yangi turnir yaratadi (Registration holatida). Settings — poyga matni sozlamalari (JSON).</summary>
public record CreateTournamentCommand(string Name, int Capacity, DateTime StartAt, string? Settings) : IRequest<Guid>;

public class CreateTournamentCommandHandler : IRequestHandler<CreateTournamentCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CreateTournamentCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Guid> Handle(CreateTournamentCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Turnir yaratish uchun tizimga kiring.");

        if (!TournamentBracket.IsValidCapacity(request.Capacity))
            throw new InvalidOperationException("Sig'im 4, 8, 16 yoki 32 bo'lishi kerak.");

        var name = string.IsNullOrWhiteSpace(request.Name) ? "Turnir" : request.Name.Trim();
        if (name.Length > 80) name = name[..80];

        var tournament = new Tournament
        {
            Name = name,
            HostId = uid,
            Capacity = request.Capacity,
            StartAt = request.StartAt.ToUniversalTime(),
            Settings = string.IsNullOrWhiteSpace(request.Settings) ? "{}" : request.Settings,
            Status = Domain.Enums.TournamentStatus.Registration
        };
        _db.Tournaments.Add(tournament);
        await _db.SaveChangesAsync(cancellationToken);
        return tournament.Id;
    }
}
