using FluentValidation;
using MediatR;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Auth;

/// <summary>Foydalanuvchini tizimga kiritadi (username yoki email + parol).</summary>
public record LoginCommand(string UsernameOrEmail, string Password) : IRequest<AuthResultDto>;

public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.UsernameOrEmail).NotEmpty();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IIdentityService _identity;

    public LoginCommandHandler(IIdentityService identity) => _identity = identity;

    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var result = await _identity.LoginAsync(request.UsernameOrEmail.Trim(), request.Password, cancellationToken);

        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors));

        return new AuthResultDto(result.UserId, result.Username, result.Email);
    }
}
