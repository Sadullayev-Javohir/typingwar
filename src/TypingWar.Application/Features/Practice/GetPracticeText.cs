using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Practice;

/// <summary>Solo practice uchun matn so'raydi.</summary>
public record GetPracticeTextQuery(
    TextMode Mode = TextMode.Words,
    Language Language = Language.Uzbek,
    Difficulty Difficulty = Difficulty.Normal,
    int WordCount = 25) : IRequest<PracticeTextDto>;

public class GetPracticeTextQueryHandler : IRequestHandler<GetPracticeTextQuery, PracticeTextDto>
{
    private readonly ITextProvider _textProvider;

    public GetPracticeTextQueryHandler(ITextProvider textProvider) => _textProvider = textProvider;

    public async Task<PracticeTextDto> Handle(GetPracticeTextQuery request, CancellationToken cancellationToken)
    {
        var text = await _textProvider.GetAsync(
            new PracticeTextRequest(request.Mode, request.Language, request.Difficulty, request.WordCount),
            cancellationToken);

        return new PracticeTextDto(
            text.TextId, text.Content, text.WordCount,
            request.Language, request.Mode, request.Difficulty, text.Source);
    }
}
