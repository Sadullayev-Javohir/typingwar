using FluentValidation;
using Mapster;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;

namespace TypingWar.Application.Features.Settings;

/// <summary>Joriy foydalanuvchining sozlamalarini saqlaydi (upsert).</summary>
public record SaveUserSettingsCommand(UserSettingsDto Settings) : IRequest<UserSettingsDto>;

public class SaveUserSettingsCommandValidator : AbstractValidator<SaveUserSettingsCommand>
{
    private static readonly int[] AllowedWordCounts = { 10, 25, 50, 100 };
    private static readonly int[] AllowedTimeLimits = { 10, 15, 30, 60, 120 };

    public SaveUserSettingsCommandValidator()
    {
        RuleFor(x => x.Settings.WordCount).Must(AllowedWordCounts.Contains)
            .WithMessage("WordCount 10/25/50/100 bo'lishi kerak.");
        RuleFor(x => x.Settings.TimeLimitSeconds).Must(AllowedTimeLimits.Contains)
            .WithMessage("TimeLimitSeconds 10/15/30/60/120 bo'lishi kerak.");
        RuleFor(x => x.Settings.FontSize).InclusiveBetween(14, 24);
        RuleFor(x => x.Settings.FontFamily).NotEmpty().MaximumLength(64);
        RuleFor(x => x.Settings.TextMode).IsInEnum();
        RuleFor(x => x.Settings.Difficulty).IsInEnum();
        RuleFor(x => x.Settings.Language).IsInEnum();
        RuleFor(x => x.Settings.Theme).IsInEnum();
        RuleFor(x => x.Settings.CaretStyle).IsInEnum();
        RuleFor(x => x.Settings.SoundOnClick).IsInEnum();
    }
}

public class SaveUserSettingsCommandHandler : IRequestHandler<SaveUserSettingsCommand, UserSettingsDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public SaveUserSettingsCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<UserSettingsDto> Handle(SaveUserSettingsCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Sozlamalarni saqlash uchun tizimga kiring.");

        var entity = await _db.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId, cancellationToken);

        if (entity is null)
        {
            entity = new UserSettings { UserId = userId };
            _db.UserSettings.Add(entity);
        }

        request.Settings.Adapt(entity);
        entity.UserId = userId;          // Adapt mapping UserId ni o'zgartirmasin
        entity.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return entity.Adapt<UserSettingsDto>();
    }
}
