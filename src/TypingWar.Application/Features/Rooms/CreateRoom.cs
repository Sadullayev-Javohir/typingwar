using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Rooms;

/// <summary>Yangi xona yaratadi (faqat tizimga kirgan foydalanuvchi host bo'la oladi).</summary>
public record CreateRoomCommand(string? Settings = null) : IRequest<RoomDto>;

public class CreateRoomCommandHandler : IRequestHandler<CreateRoomCommand, RoomDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly ICurrentUserService _currentUser;

    public CreateRoomCommandHandler(IApplicationDbContext db, ICacheService cache, ICurrentUserService currentUser)
    {
        _db = db;
        _cache = cache;
        _currentUser = currentUser;
    }

    public async Task<RoomDto> Handle(CreateRoomCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Xona yaratish uchun tizimga kiring.");

        // Noyob kod (Redis da mavjud emasligini tekshiramiz)
        string code;
        int attempts = 0;
        do { code = RoomCodeGenerator.Generate(); attempts++; }
        while (await _cache.KeyExistsAsync(RoomKey(code)) && attempts < 10);

        var room = new Room
        {
            Code = code,
            HostId = userId,
            Status = RoomStatus.Waiting,
            Settings = request.Settings ?? "{}"
        };
        room.Players.Add(new RoomPlayer { UserId = userId, IsHost = true });

        _db.Rooms.Add(room);
        await _db.SaveChangesAsync(cancellationToken);

        // Kod Redis da 30 daqiqa TTL
        await _cache.SetStringAsync(RoomKey(code), room.Id.ToString(),
            TimeSpan.FromMinutes(GameConstants.RoomCodeTtlMinutes));

        return new RoomDto(room.Id, code, userId, room.Status, true);
    }

    public static string RoomKey(string code) => $"room:{code.ToUpperInvariant()}";
}
