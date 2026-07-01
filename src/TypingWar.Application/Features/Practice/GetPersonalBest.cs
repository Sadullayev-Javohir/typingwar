using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Practice;

/// <summary>Ghost rejimi uchun: foydalanuvchining shaxsiy rekordi (WPM). Yo'q bo'lsa 0.</summary>
public record GetPersonalBestQuery(string ModeKey) : IRequest<double>;

public class GetPersonalBestQueryHandler : IRequestHandler<GetPersonalBestQuery, double>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetPersonalBestQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<double> Handle(GetPersonalBestQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not Guid userId)
            return 0;

        var pb = await _db.PersonalBests
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.ModeKey == request.ModeKey, cancellationToken);

        return pb?.BestWpm ?? 0;
    }
}
