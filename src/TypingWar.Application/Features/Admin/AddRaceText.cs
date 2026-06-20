using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Admin;

/// <summary>Admin yangi iqtibos matni qo'shadi (musobaqa/practice uchun). Source — iqtibos manbasi.</summary>
public record AddRaceTextCommand(string Content, Difficulty Difficulty, string? Source = null, Language Language = Language.Uzbek) : IRequest<Guid>;

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

        var source = request.Source?.Trim();
        if (string.IsNullOrEmpty(source)) source = null;
        else if (source.Length > 256) source = source[..256];

        var words = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        var text = new RaceText
        {
            Content = content,
            Source = source,
            Language = request.Language,
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
