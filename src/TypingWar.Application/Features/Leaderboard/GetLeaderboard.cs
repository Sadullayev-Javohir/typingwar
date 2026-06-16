using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Leaderboard;

/// <summary>Berilgan vaqt rejimi uchun leaderboard (top 50 + joriy foydalanuvchi qatori).</summary>
public record GetLeaderboardQuery(TimeMode TimeMode) : IRequest<LeaderboardDto>;

public class GetLeaderboardQueryHandler : IRequestHandler<GetLeaderboardQuery, LeaderboardDto>
{
    private readonly ILeaderboardService _leaderboard;
    private readonly ICurrentUserService _currentUser;

    public GetLeaderboardQueryHandler(ILeaderboardService leaderboard, ICurrentUserService currentUser)
    {
        _leaderboard = leaderboard;
        _currentUser = currentUser;
    }

    public Task<LeaderboardDto> Handle(GetLeaderboardQuery request, CancellationToken cancellationToken)
        => _leaderboard.GetAsync(request.TimeMode, _currentUser.UserId, cancellationToken);
}
