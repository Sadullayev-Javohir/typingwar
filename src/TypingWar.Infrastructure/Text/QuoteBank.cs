using TypingWar.Domain.Enums;

namespace TypingWar.Infrastructure.Text;

/// <summary>
/// Iqtibos rejimi uchun manbasi bilan birga keluvchi iqtiboslar to'plami.
/// Bir marta DB ga seed qilinadi (DataSeeder), keyin DB/Redis dan xizmat qilinadi —
/// har so'rovda tashqi API chaqirilmaydi (resurs tejaladi).
/// Qiyinlik uzunlik bo'yicha avtomatik aniqlanadi (Easy &lt; 90, Hard &gt; 170 belgi).
/// </summary>
public static class QuoteBank
{
    public record QuoteEntry(string Content, string Source, Language Language);

    /// <summary>Iqtibos uzunligiga qarab qiyinlik darajasi.</summary>
    public static Difficulty DifficultyFor(string content) => content.Length switch
    {
        < 90 => Difficulty.Easy,
        < 170 => Difficulty.Normal,
        _ => Difficulty.Hard
    };

    // ───────────────────────── O'ZBEK ─────────────────────────
    public static readonly QuoteEntry[] Uzbek =
    {
        // Klassik adabiyot
        new("Kishi o'z yurtini sevmasa, butun olamni sevishga qodir emas.", "Abdulla Qodiriy, \"O'tkan kunlar\"", Language.Uzbek),
        new("Insonni mehnat ulug'lar, mehnatsiz hayotda na sharaf bor, na qadr.", "Abdulla Qodiriy, \"O'tkan kunlar\"", Language.Uzbek),
        new("Sevgi insonni ham ko'taradi, ham yiqitadi; baxtli o'sha kishiki, uni ko'tara olsa.", "Abdulla Qodiriy, \"Mehrobdan chayon\"", Language.Uzbek),
        new("Ko'ngil ko'zi ochiq odam dunyoni boshqacha ko'radi.", "Cho'lpon, \"Kecha va kunduz\"", Language.Uzbek),
        new("Ozodlik — qushning qanoti, usiz uchish mumkin emas.", "Cho'lpon, \"Kecha va kunduz\"", Language.Uzbek),
        new("Hayot — kurash, kurashda yengilgan emas, taslim bo'lgan mag'lubdir.", "Oybek, \"Navoiy\"", Language.Uzbek),

        // Alisher Navoiy
        new("Odami ersang demagil odami, onikim yo'q xalq g'amidin g'ami.", "Alisher Navoiy, \"Hayrat ul-abror\"", Language.Uzbek),
        new("Kamol et kasbkim, olam uyidin senga farz o'lg'ay, hunar o'rgan-u, bilim aylagaykim, mol-u dunyodin ortiq.", "Alisher Navoiy", Language.Uzbek),
        new("Til muncha sharafki bor, nutq ilan, nutq elga sharaf erur til ila.", "Alisher Navoiy, \"Mahbub ul-qulub\"", Language.Uzbek),
        new("Vafo qilsang vafo topgaysen, jafo qilsang jafo, ekkaningni o'rasen.", "Alisher Navoiy", Language.Uzbek),

        // Zamonaviy shoirlar
        new("O'zbegim, sen-da yashurma ko'nglingdagi armonni, kelajak o'z qo'lingda, qo'ymagil bo'sh maydonni.", "Erkin Vohidov, \"O'zbegim\"", Language.Uzbek),
        new("Ona tilim — bu mening qalbim, undan ayro yashayolmasman.", "Abdulla Oripov", Language.Uzbek),
        new("Yurtim deb yongan yurakda hech qachon sovuq qish bo'lmas.", "Abdulla Oripov, \"O'zbekiston\"", Language.Uzbek),

        // O'zbek xalq maqollari
        new("Bilim — eng katta boylik, uni hech kim o'g'irlay olmaydi.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Mehnat qilsang — rohat ko'rasan, dangasalik qilsang — kulfat ko'rasan.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Til bilan tugun yechiladi, qilich bilan emas.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Yetti o'lchab, bir kes.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Birlashgan o'zar, birlashmagan to'zar.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Daryo suvini bahor toshirar, odam qadrini mehnat oshirar.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Ona yurting — oltin beshik, undan aziz joy yo'q jahonda.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Sabr tagi — sariq oltin, sabrli odam murodiga yetar.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Aql yoshda emas, boshda; kuch — bilakda emas, bilimda.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Bir daraxt — chamanmas, lekin chaman daraxtsiz bo'lmas.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Do'st boshga qaraydi, dushman oyoqqa.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Yaxshi so'z — jon ozig'i, yomon so'z — bosh qozig'i.", "O'zbek xalq maqoli", Language.Uzbek),

        // Sharq donishmandligi
        new("Ilm — yoshlikda toshga o'yilgan naqsh, qarilikda esa suvga chizilgan chiziq.", "Sharq hikmati", Language.Uzbek),
        new("O'tgan kunni qaytarib bo'lmas, kelajak kun esa hali kelmagan — bugunni qadrla.", "Sharq hikmati", Language.Uzbek),
    };

    // ───────────────────────── INGLIZ ─────────────────────────
    public static readonly QuoteEntry[] English =
    {
        // Kitoblar — Harry Potter
        new("It is our choices, Harry, that show what we truly are, far more than our abilities.", "J. K. Rowling, \"Harry Potter and the Chamber of Secrets\"", Language.English),
        new("Happiness can be found, even in the darkest of times, if one only remembers to turn on the light.", "J. K. Rowling, \"Harry Potter and the Prisoner of Azkaban\"", Language.English),
        new("It does not do to dwell on dreams and forget to live.", "J. K. Rowling, \"Harry Potter and the Philosopher's Stone\"", Language.English),

        // Kitoblar — Lord of the Rings
        new("All we have to decide is what to do with the time that is given us.", "J. R. R. Tolkien, \"The Fellowship of the Ring\"", Language.English),
        new("Not all those who wander are lost.", "J. R. R. Tolkien, \"The Lord of the Rings\"", Language.English),
        new("Even the smallest person can change the course of the future.", "J. R. R. Tolkien, \"The Fellowship of the Ring\"", Language.English),

        // Kitoblar — boshqa klassiklar
        new("It is a truth universally acknowledged that a single man in possession of a good fortune must be in want of a wife.", "Jane Austen, \"Pride and Prejudice\"", Language.English),
        new("All animals are equal, but some animals are more equal than others.", "George Orwell, \"Animal Farm\"", Language.English),
        new("War is peace. Freedom is slavery. Ignorance is strength.", "George Orwell, \"1984\"", Language.English),
        new("So we beat on, boats against the current, borne back ceaselessly into the past.", "F. Scott Fitzgerald, \"The Great Gatsby\"", Language.English),
        new("You never really understand a person until you consider things from his point of view.", "Harper Lee, \"To Kill a Mockingbird\"", Language.English),
        new("It was the best of times, it was the worst of times.", "Charles Dickens, \"A Tale of Two Cities\"", Language.English),
        new("The only way to get rid of a temptation is to yield to it.", "Oscar Wilde, \"The Picture of Dorian Gray\"", Language.English),
        new("It does not matter how slowly you go as long as you do not stop.", "Confucius, \"The Analects\"", Language.English),

        // Filmlar
        new("With great power comes great responsibility.", "Film: \"Spider-Man\" (2002)", Language.English),
        new("Why so serious?", "Film: \"The Dark Knight\" (2008)", Language.English),
        new("Life is like a box of chocolates. You never know what you're gonna get.", "Film: \"Forrest Gump\" (1994)", Language.English),
        new("May the Force be with you.", "Film: \"Star Wars\" (1977)", Language.English),
        new("Hope is a good thing, maybe the best of things, and no good thing ever dies.", "Film: \"The Shawshank Redemption\" (1994)", Language.English),

        // Mashhur insonlar
        new("Imagination is more important than knowledge.", "Albert Einstein", Language.English),
        new("The only thing we have to fear is fear itself.", "Franklin D. Roosevelt", Language.English),
        new("Genius is one percent inspiration and ninety-nine percent perspiration.", "Thomas Edison", Language.English),
        new("The future belongs to those who believe in the beauty of their dreams.", "Eleanor Roosevelt", Language.English),
        new("Success is not final, failure is not fatal: it is the courage to continue that counts.", "Winston Churchill", Language.English),
        new("Be the change that you wish to see in the world.", "Mahatma Gandhi", Language.English),
        new("The journey of a thousand miles begins with a single step.", "Lao Tzu, \"Tao Te Ching\"", Language.English),
        new("In the middle of difficulty lies opportunity.", "Albert Einstein", Language.English),
        new("Stay hungry, stay foolish.", "Steve Jobs, Stanford Commencement (2005)", Language.English),
        new("The only way to do great work is to love what you do.", "Steve Jobs", Language.English),
        new("I have a dream that my four little children will one day live in a nation where they will not be judged by the color of their skin but by the content of their character.", "Martin Luther King Jr., \"I Have a Dream\" (1963)", Language.English),
        new("Ask not what your country can do for you, ask what you can do for your country.", "John F. Kennedy, Inaugural Address (1961)", Language.English),
        new("That's one small step for man, one giant leap for mankind.", "Neil Armstrong (1969)", Language.English),
        new("Knowledge is power.", "Francis Bacon", Language.English),
        new("Whether you think you can or you think you can't, you're right.", "Henry Ford", Language.English),
    };

    /// <summary>Barcha iqtiboslar (o'zbek + ingliz).</summary>
    public static IEnumerable<QuoteEntry> All()
    {
        foreach (var q in Uzbek) yield return q;
        foreach (var q in English) yield return q;
    }
}
