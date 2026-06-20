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

    /// <summary>Iqtibos uzunlik toifasi (monkeytype uslubi: short/medium/long/thick).</summary>
    public enum QuoteLength { Short, Medium, Long, Thick }

    // Belgilar soni bo'yicha chegaralar — TextProvider filtri ham shu chegaralardan foydalanadi.
    public const int ShortMax = 130;   // qisqa: <= 130
    public const int MediumMax = 280;  // o'rta:  131..280
    public const int LongMax = 550;    // uzun:   281..550 (undan ortig'i — juda uzun/thick)

    public static QuoteLength LengthFor(string content) => content.Length switch
    {
        <= ShortMax => QuoteLength.Short,
        <= MediumMax => QuoteLength.Medium,
        <= LongMax => QuoteLength.Long,
        _ => QuoteLength.Thick
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

        // Qisqa maqollar (short)
        new("Mehnat — baxt kaliti.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Vatan ostonadan boshlanadi.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Bilimli ming yashar, bilimsiz kun ko'rmas.", "O'zbek xalq maqoli", Language.Uzbek),
        new("So'zni eshit, ammo o'z aqling bilan ish ko'r.", "O'zbek xalq maqoli", Language.Uzbek),
        new("Tomchi tama-tama ko'l bo'lar.", "O'zbek xalq maqoli", Language.Uzbek),

        // O'rta uzunlikdagi iqtiboslar (medium)
        new("Inson o'z umrini shunday o'tkazmog'i kerakki, keksaygan chog'ida o'tgan kunlaridan uyalmasin, balki ularni faxr bilan eslay olsin.", "Sharq hikmati", Language.Uzbek),
        new("Kitob — eng sodiq do'st, u na maqtaydi, na yuzingga soladi; faqat seni har gal yangi bilim bilan boyitadi va hech qachon tashlab ketmaydi.", "Hikmatli so'z", Language.Uzbek),
        new("Yaxshilik qilishdan charchama, chunki bugun ekkan urug'ing ertaga unib, sen kutmagan kunda mevasini senga qaytaradi.", "Sharq hikmati", Language.Uzbek),
        new("Aql bilan boylik — ikkovi birga kelsa, baxt bo'ladi; lekin ikkovidan birini tanlash kerak bo'lsa, donishmand aqlni tanlaydi.", "Hikmatli so'z", Language.Uzbek),

        // Uzun iqtiboslar (long)
        new("Ona tili — bu shunchaki muloqot vositasi emas, balki bir xalqning butun tarixi, dunyoqarashi, qadriyatlari va ruhi jamlangan xazinadir. Tilini yo'qotgan millat o'zligini, o'tmishini va kelajagini ham yo'qotadi; shuning uchun har bir so'zni asrash — Vatanni asrashdir.", "Adabiy mulohaza", Language.Uzbek),
        new("Hayotda eng katta g'alaba — bu boshqalarni yengish emas, balki o'z nafsini, qo'rquvini va dangasaligini yenga olishdir. Kim har kuni ertalab o'zini bir qadam oldinga undasa, yillar o'tib o'zi ham bilmagan cho'qqilarga chiqqan bo'ladi.", "Hikmatli so'z", Language.Uzbek),

        // Juda uzun iqtiboslar (thick — paragraf)
        new("Ilm olish yo'li mashaqqatli, ammo uning mevasi shirin. Bilim insonni nodonlik zulmatidan ma'rifat nuriga olib chiqadi, uning ko'nglini kengaytiradi, dunyoga boshqacha nazar bilan qarashga o'rgatadi. Kim ilmni izlab yo'lga chiqsa, Alloh unga jannat yo'lini osonlashtiradi; chunki olimlarning siyohi shahidlarning qonidan ham qimmatlidir. Shuning uchun beshikdan to qabrgacha ilm izlang — bu izlanish hech qachon to'xtamasligi kerak. Har kuni bir yangi narsa o'rganishga intil, bilmaganingni so'rashdan uyalma, chunki bir lahzalik savol berishning uyati nodon bo'lib qolishning bir umrlik uyatidan ko'ra yengilroqdir.", "Sharq hikmati", Language.Uzbek),
        new("Insonning qadri uning mol-dunyosi yoki mansabi bilan emas, balki ko'rsatgan yaxshiligi, aytgan rost so'zi va bajargan halol mehnati bilan o'lchanadi. Boylik kelib-ketadi, mansab vaqtinchalik, go'zallik so'libdiyodan ketadi; lekin yaxshi nom va ezgu amal — bular insondan keyin ham asrlar davomida yashaydi. Shuning uchun har bir kuningni shunday o'tkazki, kechqurun yostiqqa bosh qo'yganingda vijdoning tinch bo'lsin, va kimnidir xafa qilgan bo'lsang, ertasiga undan kechirim so'rashga ulgur. Hayot qisqa, ammo unga sig'dirgan ezgu ishlaring son-sanoqsiz bo'lsa, umring uzun yashagan bilan barobardir.", "Hikmatli so'z", Language.Uzbek),
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

        // Qisqa (short)
        new("Simplicity is the ultimate sophistication.", "Leonardo da Vinci", Language.English),
        new("Talk is cheap. Show me the code.", "Linus Torvalds", Language.English),
        new("The best way to predict the future is to invent it.", "Alan Kay", Language.English),
        new("Time is what we want most, but what we use worst.", "William Penn", Language.English),

        // O'rta (medium)
        new("Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do, so throw off the bowlines and sail away from the safe harbor.", "Mark Twain", Language.English),
        new("I have not failed. I've just found ten thousand ways that won't work. Many of life's failures are people who did not realize how close they were to success when they gave up.", "Thomas Edison", Language.English),
        new("Do not go where the path may lead, go instead where there is no path and leave a trail; for the people who are crazy enough to think they can change the world are the ones who do.", "Ralph Waldo Emerson", Language.English),

        // Uzun (long)
        new("Our greatest glory is not in never falling, but in rising every time we fall. The man who moves a mountain begins by carrying away small stones, and the journey of a thousand miles must begin with a single step taken today rather than postponed to a tomorrow that may never come.", "Confucius, \"The Analects\"", Language.English),
        new("Two roads diverged in a wood, and I took the one less traveled by, and that has made all the difference. We are all in the gutter, but some of us are looking at the stars, and it is precisely those dreamers, gazing upward in the dark, who light the way for everyone left behind.", "Robert Frost & Oscar Wilde", Language.English),

        // Juda uzun (thick — paragraf)
        new("We choose to go to the Moon in this decade and do the other things, not because they are easy, but because they are hard; because that goal will serve to organize and measure the best of our energies and skills, because that challenge is one that we are willing to accept, one we are unwilling to postpone, and one we intend to win. For the eyes of the world now look into space, to the Moon and to the planets beyond, and we have vowed that we shall not see it governed by a hostile flag of conquest, but by a banner of freedom and peace. We set sail on this new sea because there is new knowledge to be gained, and new rights to be won, and they must be won and used for the progress of all people.", "John F. Kennedy, Rice University (1962)", Language.English),
        new("It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again, because there is no effort without error and shortcoming; but who does actually strive to do the deeds; who knows great enthusiasms, the great devotions; who spends himself in a worthy cause; who at the best knows in the end the triumph of high achievement, and who at the worst, if he fails, at least fails while daring greatly, so that his place shall never be with those cold and timid souls who neither know victory nor defeat.", "Theodore Roosevelt, \"The Man in the Arena\" (1910)", Language.English),
    };

    /// <summary>Barcha iqtiboslar (o'zbek + ingliz).</summary>
    public static IEnumerable<QuoteEntry> All()
    {
        foreach (var q in Uzbek) yield return q;
        foreach (var q in English) yield return q;
    }
}
