using MediatR;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Admin;

/// <summary>
/// Admin: foydalanuvchini va barcha bog'liq ma'lumotlarini o'chiradi.
/// O'zini o'chirib bo'lmaydi; SuperAdmin himoyalangan (servis darajasida).
/// </summary>
public record DeleteUserCommand(Guid UserId) : IRequest<Unit>;

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Unit>
{
    private readonly IAdminService _admin;
    private readonly ICurrentUserService _currentUser;

    public DeleteUserCommandHandler(IAdminService admin, ICurrentUserService currentUser)
    {
        _admin = admin;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == request.UserId)
            throw new InvalidOperationException("O'zingizni o'chira olmaysiz.");

        await _admin.DeleteUserAsync(request.UserId, cancellationToken);
        return Unit.Value;
    }
}
