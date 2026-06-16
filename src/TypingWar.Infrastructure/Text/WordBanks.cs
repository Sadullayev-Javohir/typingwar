using TypingWar.Domain.Enums;

namespace TypingWar.Infrastructure.Text;

/// <summary>Words/Code rejimi uchun so'z va kod bankalari (til bo'yicha).</summary>
public static class WordBanks
{
    public static readonly string[] Uzbek =
    {
        "men", "sen", "biz", "ular", "kun", "tun", "non", "suv", "yer", "osmon",
        "bola", "ona", "ota", "uy", "maktab", "kitob", "qalam", "daftar", "stol", "deraza",
        "yaxshi", "yomon", "katta", "kichik", "tez", "sekin", "issiq", "sovuq", "baland", "past",
        "kelmoq", "ketmoq", "yozmoq", "o'qimoq", "ishlamoq", "o'ynamoq", "kulmoq", "yugurmoq", "uxlamoq", "yemoq",
        "shahar", "qishloq", "ko'cha", "bozor", "do'kon", "bog'", "daraxt", "gul", "barg", "meva",
        "olma", "uzum", "anor", "shaftoli", "behi", "qovun", "tarvuz", "sabzi", "piyoz", "kartoshka",
        "vatan", "xalq", "tinchlik", "do'stlik", "mehnat", "bilim", "hayot", "baxt", "quvonch", "umid",
        "ertalab", "kechqurun", "bugun", "ertaga", "kecha", "hafta", "oy", "yil", "fasl", "bahor",
        "yoz", "kuz", "qish", "yomg'ir", "qor", "shamol", "quyosh", "yulduz", "bulut", "kamalak",
        "barmoq", "tezlik", "musobaqa", "g'alaba", "klaviatura", "harf", "so'z", "matn", "yozuv", "mashq"
    };

    public static readonly string[] English =
    {
        "the", "and", "for", "you", "are", "with", "his", "they", "have", "this",
        "from", "one", "had", "word", "but", "not", "what", "all", "were", "when",
        "your", "can", "said", "there", "use", "each", "which", "she", "how", "their",
        "time", "will", "way", "about", "many", "then", "them", "write", "would", "like",
        "these", "her", "long", "make", "thing", "see", "him", "two", "look", "more",
        "day", "could", "come", "did", "number", "sound", "most", "people", "over", "know",
        "water", "than", "call", "first", "who", "down", "side", "been", "now", "find",
        "any", "new", "work", "part", "take", "get", "place", "made", "live", "where",
        "after", "back", "little", "only", "round", "man", "year", "came", "show", "every",
        "good", "give", "our", "under", "name", "very", "through", "just", "form", "much"
    };

    public static readonly string[] Russian =
    {
        "и", "в", "не", "на", "я", "быть", "он", "с", "что", "это",
        "как", "она", "по", "но", "они", "мы", "этот", "к", "из", "у",
        "который", "то", "за", "свой", "весь", "год", "от", "так", "о", "для",
        "вот", "когда", "уже", "если", "дело", "жизнь", "день", "рука", "раз", "там",
        "себя", "сказать", "знать", "стать", "только", "другой", "время", "слово", "место", "дом",
        "вода", "город", "люди", "работа", "мир", "друг", "школа", "книга", "стол", "окно",
        "хороший", "большой", "новый", "первый", "русский", "сейчас", "очень", "можно", "нужно", "теперь"
    };

    public static readonly string[] CodeSnippets =
    {
        "public void Main() { return; }",
        "var x = items.Where(i => i.Active).ToList();",
        "if (count > 0) { total += count; }",
        "for (int i = 0; i < n; i++) sum += arr[i];",
        "const result = await fetch(url).then(r => r.json());",
        "def calc(a, b): return a + b",
        "SELECT id, name FROM users WHERE active = true;",
        "while (node != null) { node = node.next; }",
        "throw new InvalidOperationException(\"error\");",
        "return list.OrderByDescending(x => x.Wpm).Take(50);"
    };

    public static string[] ForLanguage(Language language) => language switch
    {
        Language.English => English,
        Language.Russian => Russian,
        _ => Uzbek
    };

    /// <summary>Difficulty bo'yicha so'z uzunligi chegarasi (Words rejimini murakkablashtirish).</summary>
    public static int MaxWordLength(Difficulty difficulty) => difficulty switch
    {
        Difficulty.Easy => 5,
        Difficulty.Normal => 8,
        Difficulty.Hard => 12,
        _ => int.MaxValue
    };
}
