using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Settings;

/// <summary>Joriy foydalanuvchining sozlamalarini qaytaradi (yo'q bo'lsa — default).</summary>
public record GetUserSettingsQuery : IRequest<UserSettingsDto>;

public class GetUserSettingsQueryHandler : IRequestHandler<GetUserSettingsQuery, UserSettingsDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetUserSettingsQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<UserSettingsDto> Handle(GetUserSettingsQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not Guid userId)
            return new UserSettingsDto();

        var entity = await _db.UserSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        return entity is null ? new UserSettingsDto() : entity.Adapt<UserSettingsDto>();
    }
}
