using MediatR;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Admin;

/// <summary>Admin: barcha foydalanuvchilar ro'yxati (ixtiyoriy qidiruv).</summary>
public record ListUsersQuery(string? Search) : IRequest<IReadOnlyList<AdminUserDto>>;

public class ListUsersQueryHandler : IRequestHandler<ListUsersQuery, IReadOnlyList<AdminUserDto>>
{
    private readonly IAdminService _admin;

    public ListUsersQueryHandler(IAdminService admin) => _admin = admin;

    public Task<IReadOnlyList<AdminUserDto>> Handle(ListUsersQuery request, CancellationToken cancellationToken)
        => _admin.ListUsersAsync(request.Search, cancellationToken);
}
