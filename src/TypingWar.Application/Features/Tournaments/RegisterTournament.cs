using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Joriy foydalanuvchini turnirga ro'yxatdan o'tkazadi.</summary>
public record RegisterTournamentCommand(Guid TournamentId) : IRequest<Unit>;

public class RegisterTournamentCommandHandler : IRequestHandler<RegisterTournamentCommand, Unit>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public RegisterTournamentCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(RegisterTournamentCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Ro'yxatdan o'tish uchun tizimga kiring.");
        var username = _currentUser.Username ?? "Foydalanuvchi";

        var tournament = await _db.Tournaments
            .FirstOrDefaultAsync(t => t.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");

        if (tournament.Status != TournamentStatus.Registration)
            throw new InvalidOperationException("Ro'yxatdan o'tish yopilgan.");

        bool already = await _db.TournamentPlayers
            .AnyAsync(p => p.TournamentId == tournament.Id && p.UserId == uid, cancellationToken);
        if (already) return Unit.Value;

        int count = await _db.TournamentPlayers.CountAsync(p => p.TournamentId == tournament.Id, cancellationToken);
        if (count >= tournament.Capacity)
            throw new InvalidOperationException("Turnir to'lgan.");

        _db.TournamentPlayers.Add(new TournamentPlayer
        {
            TournamentId = tournament.Id,
            UserId = uid,
            Username = username,
            Seed = count + 1
        });
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}
