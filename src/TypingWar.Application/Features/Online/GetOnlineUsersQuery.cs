using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Online;

namespace TypingWar.Application.Features.Online;

/// <summary>Joriy onlayn foydalanuvchilar ro'yxati (ID, username, o'rtacha WPM, hudud).</summary>
public record GetOnlineUsersQuery : IRequest<IReadOnlyList<OnlineUserDto>>;

public class GetOnlineUsersQueryHandler : IRequestHandler<GetOnlineUsersQuery, IReadOnlyList<OnlineUserDto>>
{
    private readonly IOnlineUserProvider _online;
    public GetOnlineUsersQueryHandler(IOnlineUserProvider online) => _online = online;
    public Task<IReadOnlyList<OnlineUserDto>> Handle(GetOnlineUsersQuery request, CancellationToken ct)
        => Task.FromResult(_online.GetList());
}
