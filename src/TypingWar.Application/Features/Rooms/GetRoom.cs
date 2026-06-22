using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Rooms;

/// <summary>Kod bo'yicha xonani topadi (Redis TTL → DB). Topilmasa null.</summary>
public record GetRoomQuery(string Code) : IRequest<RoomDto?>;

public class GetRoomQueryHandler : IRequestHandler<GetRoomQuery, RoomDto?>
{
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly ICurrentUserService _currentUser;

    public GetRoomQueryHandler(IApplicationDbContext db, ICacheService cache, ICurrentUserService currentUser)
    {
        _db = db;
        _cache = cache;
        _currentUser = currentUser;
    }

    public async Task<RoomDto?> Handle(GetRoomQuery request, CancellationToken cancellationToken)
    {
        var code = request.Code.ToUpperInvariant();

        Domain.Entities.Room? room = null;
        var idStr = await _cache.GetStringAsync(CreateRoomCommandHandler.RoomKey(code));
        if (idStr is not null && Guid.TryParse(idStr, out var rid))
            room = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == rid, cancellationToken);

        room ??= await _db.Rooms.FirstOrDefaultAsync(r => r.Code == code, cancellationToken);

        if (room is null || room.Status == RoomStatus.Expired)
            return null;

        return new RoomDto(room.Id, room.Code, room.HostId, room.Status,
            _currentUser.UserId == room.HostId, room.Settings ?? "{}");
    }
}
