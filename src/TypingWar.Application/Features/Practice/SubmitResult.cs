using FluentValidation;
using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Practice;

/// <summary>Tugagan testning natijasini saqlaydi (RaceResult + PersonalBest).</summary>
public record SubmitResultCommand(
    TimeMode TimeMode,
    int CorrectChars,
    int IncorrectChars,
    double ElapsedSeconds,
    Guid? TextId) : IRequest<RaceResultDto>;

public class SubmitResultCommandValidator : AbstractValidator<SubmitResultCommand>
{
    public SubmitResultCommandValidator()
    {
        RuleFor(x => x.ElapsedSeconds).GreaterThan(0);
        RuleFor(x => x.CorrectChars).GreaterThanOrEqualTo(0);
        RuleFor(x => x.IncorrectChars).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TimeMode).IsInEnum();
    }
}

public class SubmitResultCommandHandler : IRequestHandler<SubmitResultCommand, RaceResultDto>
{
    private readonly ICurrentUserService _currentUser;
    private readonly ISender _mediator;

    public SubmitResultCommandHandler(ICurrentUserService currentUser, ISender mediator)
    {
        _currentUser = currentUser;
        _mediator = mediator;
    }

    public Task<RaceResultDto> Handle(SubmitResultCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Natijani saqlash uchun tizimga kiring.");

        return _mediator.Send(new RecordResultCommand(
            userId, request.TimeMode, request.CorrectChars, request.IncorrectChars,
            request.ElapsedSeconds, request.TextId), cancellationToken);
    }
}
