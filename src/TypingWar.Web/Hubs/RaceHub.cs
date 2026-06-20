using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Practice;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Web.Hubs;

/// <summary>
/// AI raqib / Ghost / Blind Duel poygalari. AI yozish jadvali serverda quriladi,
/// klient uni animatsiya qiladi. Tugagach natija saqlanadi + AI delta moslanadi.
/// </summary>
[AllowAnonymous]
public class RaceHub : Hub
{
    private const int DefaultWpm = 40;

    private readonly IAiOpponentService _ai;
    private readonly ITextProvider _textProvider;
    private readonly ISender _mediator;

    public RaceHub(IAiOpponentService ai, ITextProvider textProvider, ISender mediator)
    {
        _ai = ai;
        _textProvider = textProvider;
        _mediator = mediator;
    }

    private Guid? UserId =>
        Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    /// <summary>
    /// AI poyga boshlaydi — foydalanuvchi tanlagan til/rejim bo'yicha matn +
    /// AI yozish jadvali + maqsadli WPM. So'rov bo'sh bo'lsa standart (o'zbek iqtibos).
    /// </summary>
    public async Task<object> StartAiRace(AiRaceRequest? request = null)
    {
        var uid = UserId;
        int target = uid.HasValue ? await _ai.GetTargetWpmAsync(uid.Value) : DefaultWpm;

        var mode = ParseEnum(request?.Mode, TextMode.Sentences);
        var lang = ParseEnum(request?.Language, Language.Uzbek);
        var wordCount = request?.WordCount is > 0 ? request!.WordCount : 25;

        var text = await _textProvider.GetAsync(
            new PracticeTextRequest(mode, lang, Difficulty.Normal, wordCount, request?.QuoteLength));
        var schedule = AiTypingSimulator.BuildSchedule(target, text.Content.Length);

        return new
        {
            text = text.Content,
            textId = text.TextId,
            targetWpm = target,
            schedule,
            source = text.Source
        };
    }

    private static T ParseEnum<T>(string? value, T fallback) where T : struct, Enum =>
        Enum.TryParse<T>(value, ignoreCase: true, out var parsed) ? parsed : fallback;

    /// <summary>AI/Blind Duel poyga tugadi — natijani saqlash + AI delta ni moslash.</summary>
    public async Task FinishAiRace(int timeMode, int correctChars, int incorrectChars,
        double elapsedSeconds, Guid? textId, bool won)
    {
        var uid = UserId;
        if (!uid.HasValue) return;   // anonim — saqlanmaydi

        try
        {
            await _mediator.Send(new RecordResultCommand(
                uid.Value, ToTimeMode(timeMode), correctChars, incorrectChars, elapsedSeconds, textId));
        }
        catch (InvalidOperationException)
        {
            // Aldash himoyasi — natija saqlanmaydi, lekin delta baribir moslanadi
        }

        await _ai.UpdateAfterRaceAsync(uid.Value, won);
    }

    /// <summary>AI poyga so'rovi — foydalanuvchi tanlagan til/rejim/uzunlik.</summary>
    public record AiRaceRequest(string? Mode, string? Language, int WordCount, string? QuoteLength);

    private static TimeMode ToTimeMode(int seconds) => seconds switch
    {
        10 => TimeMode.Ten,
        15 => TimeMode.Fifteen,
        60 => TimeMode.Sixty,
        120 => TimeMode.OneTwenty,
        _ => TimeMode.Thirty
    };
}
