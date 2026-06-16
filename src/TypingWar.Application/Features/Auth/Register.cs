using FluentValidation;
using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;

namespace TypingWar.Application.Features.Auth;

/// <summary>Yangi foydalanuvchi ro'yxatdan o'tkazadi.</summary>
public record RegisterCommand(string Username, string Email, string Password, string? RegionCode) : IRequest<AuthResultDto>;

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Username).NotEmpty().Length(3, 32)
            .Matches("^[a-zA-Z0-9_]+$").WithMessage("Foydalanuvchi nomi faqat harf, raqam va _ dan iborat bo'lsin.");
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.RegionCode)
            .Must(c => string.IsNullOrEmpty(c) || UzbekistanRegions.IsValid(c))
            .WithMessage("Noto'g'ri hudud kodi.");
    }
}

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResultDto>
{
    private readonly IIdentityService _identity;

    public RegisterCommandHandler(IIdentityService identity) => _identity = identity;

    public async Task<AuthResultDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var result = await _identity.RegisterAsync(
            request.Username.Trim(), request.Email.Trim(), request.Password, request.RegionCode, cancellationToken);

        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors));

        return new AuthResultDto(result.UserId, result.Username, result.Email);
    }
}
