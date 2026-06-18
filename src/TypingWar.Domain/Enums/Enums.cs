namespace TypingWar.Domain.Enums;

/// <summary>Poyga (race) holati — real-time musobaqa hayot sikli.</summary>
public enum RaceStatus
{
    Waiting = 0,
    Countdown = 1,
    InProgress = 2,
    Finished = 3
}

/// <summary>Xona (room) holati — do'stlar musobaqasi.</summary>
public enum RoomStatus
{
    Waiting = 0,
    Countdown = 1,
    InProgress = 2,
    Finished = 3,
    Expired = 4
}

/// <summary>Vaqt rejimi — typing testi davomiyligi (soniya).</summary>
public enum TimeMode
{
    Ten = 10,
    Fifteen = 15,
    Thirty = 30,
    Sixty = 60,
    OneTwenty = 120
}

/// <summary>Matn tili.</summary>
public enum Language
{
    Uzbek = 0,
    English = 1
}

/// <summary>Matn qiyinligi.</summary>
public enum Difficulty
{
    Easy = 0,
    Normal = 1,
    Hard = 2,
    Expert = 3
}

/// <summary>Matn turi.</summary>
public enum TextMode
{
    Words = 0,
    Sentences = 1,
    Numbers = 2,
    Code = 3
}

/// <summary>Sabotaj turi — 3+ o'yinchili musobaqada raqibga qarshi effekt.</summary>
public enum SabotageType
{
    Blackout = 0,
    Shuffle = 1,
    Shake = 2,
    Mirror = 3,
    Slowdown = 4
}

/// <summary>Turnir holati.</summary>
public enum TournamentStatus
{
    Registration = 0,
    InProgress = 1,
    Finished = 2
}

/// <summary>Turnir bracket turi.</summary>
public enum BracketType
{
    SingleElimination = 0,
    DoubleElimination = 1
}

/// <summary>Daily contest holati.</summary>
public enum ContestStatus
{
    Scheduled = 0,
    Active = 1,
    Finished = 2
}

/// <summary>Jamoa belgisi (5x5 musobaqa).</summary>
public enum TeamSide
{
    A = 0,
    B = 1
}

/// <summary>Do'stlik so'rovi holati.</summary>
public enum FriendshipStatus
{
    Pending = 0,
    Accepted = 1,
    Declined = 2,
    Blocked = 3
}

/// <summary>UI mavzusi.</summary>
public enum Theme
{
    Dark = 0,
    Light = 1,
    Sepia = 2,
    Custom = 3,
    Nord = 4,
    Monokai = 5,
    Solarized = 6,
    Ocean = 7,
    Forest = 8,
    Rose = 9,
    Terminal = 10,
    // Qo'shimcha Vercel uslubidagi mavzular
    Indigo = 11,
    Sky = 12,
    Lime = 13,
    Tangerine = 14,
    Ruby = 15,
    Fuchsia = 16,
    Mint = 17,
    Gold = 18,
    Slate = 19,
    Magenta = 20
}

/// <summary>Karet (kursor) ko'rinishi.</summary>
public enum CaretStyle
{
    Line = 0,
    Block = 1,
    Underline = 2,
    Off = 3,
    // Qo'shimcha 10 ta karet uslubi
    Thick = 4,
    Bottom = 5,
    Box = 6,
    Laser = 7,
    Neon = 8,
    Pulse = 9,
    Double = 10,
    Dot = 11,
    Wedge = 12,
    Rainbow = 13
}

/// <summary>Tugma bosilganda ovoz.</summary>
public enum SoundOnClick
{
    Off = 0,
    Soft = 1,
    Mechanical = 2,
    Typewriter = 3,
    // Qo'shimcha 10 ta klaviatura ovozi (qimmat mexanik switch'lar)
    CherryBlue = 4,
    CherryBrown = 5,
    CherryRed = 6,
    HolyPanda = 7,
    GateronInk = 8,
    BoxJade = 9,
    Topre = 10,
    ModelM = 11,
    Creamy = 12,
    Alps = 13
}
