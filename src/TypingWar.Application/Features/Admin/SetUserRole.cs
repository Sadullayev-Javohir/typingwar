using MediatR;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Admin;

/// <summary>SuperAdmin: foydalanuvchiga Admin rolini beradi yoki olib tashlaydi.</summary>
public record SetUserRoleCommand(Guid UserId, bool IsAdmin) : IRequest<IReadOnlyList<string>>;

public class SetUserRoleCommandHandler : IRequestHandler<SetUserRoleCommand, IReadOnlyList<string>>
{
    private readonly IAdminService _admin;

    public SetUserRoleCommandHandler(IAdminService admin) => _admin = admin;

    public Task<IReadOnlyList<string>> Handle(SetUserRoleCommand request, CancellationToken cancellationToken)
        => _admin.SetAdminRoleAsync(request.UserId, request.IsAdmin, cancellationToken);
}
