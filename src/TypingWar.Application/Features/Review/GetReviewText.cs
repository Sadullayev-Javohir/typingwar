using System.Text;
using MediatR;
using TypingWar.Application.Features.Fingerprint;

namespace TypingWar.Application.Features.Review;

/// <summary>Takroriy mashq matni — sekin tugma/bigramlarga e'tibor.</summary>
public record ReviewTextDto(string Text, IReadOnlyList<string> FocusKeys, bool FromFingerprint);

/// <summary>Foydalanuvchining sekin tugmalaridan fokuslangan mashq matnini yasaydi.</summary>
public record GetReviewTextQuery : IRequest<ReviewTextDto>;

public class GetReviewTextQueryHandler : IRequestHandler<GetReviewTextQuery, ReviewTextDto>
{
    private const string Fallback = "asdf jkl; qwer uiop zxcv bnm, ghfd treq poiu mnbv";

    private readonly ISender _mediator;

    public GetReviewTextQueryHandler(ISender mediator) => _mediator = mediator;

    public async Task<ReviewTextDto> Handle(GetReviewTextQuery request, CancellationToken cancellationToken)
    {
        var fp = await _mediator.Send(new GetFingerprintQuery(), cancellationToken);

        var keys = fp.SlowKeys.Select(s => s.Key).Where(k => k.Length == 1).Take(6).ToList();
        var bigrams = fp.SlowBigrams.Select(s => s.Key).Where(b => b.Length == 2).Take(6).ToList();

        if (keys.Count == 0 && bigrams.Count == 0)
            return new ReviewTextDto(Fallback, Array.Empty<string>(), false);

        var focus = keys.Concat(bigrams).ToList();
        var rng = new Random();
        var sb = new StringBuilder();

        // 40 ta "drill so'z" — sekin elementlarni aralashtirib
        for (int i = 0; i < 40; i++)
        {
            if (i > 0) sb.Append(' ');
            int len = rng.Next(3, 6);
            for (int j = 0; j < len; j++)
                sb.Append(focus[rng.Next(focus.Count)]);
        }

        return new ReviewTextDto(sb.ToString(), focus, true);
    }
}
