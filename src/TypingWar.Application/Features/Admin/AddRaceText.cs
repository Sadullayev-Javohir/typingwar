using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Admin;

/// <summary>Admin yangi jumla matni qo'shadi (musobaqa/practice uchun).</summary>
public record AddRaceTextCommand(string Content, Difficulty Difficulty) : IRequest<Guid>;

public class AddRaceTextCommandHandler : IRequestHandler<AddRaceTextCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public AddRaceTextCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Guid> Handle(AddRaceTextCommand request, CancellationToken cancellationToken)
    {
        var content = request.Content?.Trim() ?? string.Empty;
        if (content.Length < 10)
            throw new InvalidOperationException("Matn juda qisqa (kamida 10 belgi).");
        if (content.Length > 2000)
            content = content[..2000];

        var words = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var text = new RaceText
        {
            Content = content,
            Language = Language.Uzbek,
            Difficulty = request.Difficulty,
            Category = TextMode.Sentences,
            WordCount = words,
            IsActive = true
        };
        _db.RaceTexts.Add(text);
        await _db.SaveChangesAsync(cancellationToken);
        return text.Id;
    }
}
