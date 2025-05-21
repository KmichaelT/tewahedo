// Script to add sample questions and answers to test pagination, search, and filtering
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

// Sample questions data with categories and tags for testing
const sampleQuestions = [
  {
    title: "What is the role of fasting in the Ethiopian Orthodox Tewahedo tradition?",
    content: "<p>I'm interested in learning about the fasting traditions of the Ethiopian Orthodox Tewahedo Church. How many fasting days are there in the year? What are the rules during fasting periods? And how does this compare to fasting in other Orthodox traditions?</p>",
    author: "NewBeliever23",
    status: "published",
    category: "Spiritual Practices",
    tags: "fasting,traditions,spiritual discipline"
  },
  {
    title: "What is the significance of the tabot in Ethiopian Orthodox churches?",
    content: "<p>I've read that Ethiopian Orthodox churches contain a tabot, which is a replica of the Ark of the Covenant. What is the spiritual and historical significance of the tabot? How is it used in worship, and why is it so central to Ethiopian Orthodox tradition?</p>",
    author: "HistoryExplorer",
    status: "published",
    category: "Church Architecture",
    tags: "tabot,ark of covenant,sacred objects"
  },
  {
    title: "How does the Ethiopian Orthodox Church view the Holy Trinity?",
    content: "<p>I'm studying different Christian denominations' understanding of the Trinity. Could someone explain the Ethiopian Orthodox Tewahedo Church's theological position on the Holy Trinity? Are there any unique aspects or emphases in how the Trinity is understood?</p>",
    author: "TheologyStudent",
    status: "published", 
    category: "Theology",
    tags: "trinity,doctrine,theology"
  },
  {
    title: "What saints are particularly venerated in the Ethiopian Orthodox tradition?",
    content: "<p>I'm curious about which saints hold special importance in the Ethiopian Orthodox Tewahedo Church. Are there saints who are uniquely Ethiopian? How does saint veneration differ from other Orthodox traditions?</p>",
    author: "FaithJourney",
    status: "published",
    category: "Saints",
    tags: "saints,veneration,Ethiopian saints"
  },
  {
    title: "Can someone explain the Ethiopian Orthodox position on Christology?",
    content: "<p>I understand that the Ethiopian Orthodox Church is part of the Oriental Orthodox family and holds to miaphysite Christology. Could someone explain this theological position in detail? How does it differ from Chalcedonian Christology of Eastern Orthodox and Catholic churches?</p>",
    author: "TheologyBuff",
    status: "published",
    category: "Theology",
    tags: "christology,doctrine,miaphysitism"
  },
  {
    title: "What is the meaning behind the elaborate cross designs in Ethiopian Orthodox art?",
    content: "<p>I've been fascinated by the beautiful and complex cross designs in Ethiopian Orthodox art and architecture. What is the symbolism behind these intricate cross patterns? Do different designs have different meanings?</p>",
    author: "ArtAppreciator",
    status: "published",
    category: "Art and Symbolism",
    tags: "crosses,art,symbolism"
  },
  {
    title: "What is the process for becoming a deacon or priest in the Ethiopian Orthodox Church?",
    content: "<p>I'm interested in learning about the ordination process in the Ethiopian Orthodox tradition. What are the requirements for becoming a deacon or priest? What kind of training is involved? Are married men allowed to become priests?</p>",
    author: "VocationExplorer",
    status: "pending",
    category: "Clergy",
    tags: "ordination,priesthood,vocations"
  },
  {
    title: "How are the sacraments (mysteries) practiced in the Ethiopian Orthodox Church?",
    content: "<p>I'd like to understand how the Ethiopian Orthodox Church practices the holy sacraments. How many sacraments are recognized? Are there any differences in how baptism, communion, confession, etc. are approached compared to other Orthodox traditions?</p>",
    author: "SacramentalLife",
    status: "published",
    category: "Sacraments",
    tags: "baptism,eucharist,holy mysteries"
  },
  {
    title: "What is the Ethiopian Orthodox teaching about life after death?",
    content: "<p>I'm interested in learning about the Ethiopian Orthodox Church's teachings on what happens after death. What are the beliefs about heaven, hell, judgment, and prayer for the departed? Are there any distinctive elements compared to other Christian traditions?</p>",
    author: "EschatologyStudent",
    status: "published",
    category: "Afterlife",
    tags: "heaven,hell,prayer for dead"
  },
  {
    title: "What languages are used in Ethiopian Orthodox worship and why?",
    content: "<p>I know that Ge'ez is an ancient liturgical language of the Ethiopian Orthodox Church, but I'm wondering what other languages are used in services today. How much of the liturgy remains in Ge'ez versus Amharic or other languages? What is the significance of preserving Ge'ez in worship?</p>",
    author: "LanguageLover",
    status: "published",
    category: "Liturgy",
    tags: "Ge'ez,languages,worship"
  }
];

// Sample answers for the questions
const sampleAnswers = [
  // Answer for fasting question
  {
    questionId: 2,
    content: "<p>Fasting is a central spiritual discipline in the Ethiopian Orthodox Tewahedo Church, with more fasting days than perhaps any other Christian tradition. Here are the key aspects:</p><ul><li>Ethiopian Orthodox Christians observe approximately 180-250 fasting days per year, depending on one's level of piety and observance.</li><li>The main fasting periods include the 55-day Fast of Lent (Hudade or Abiy Tsom), the Fast of the Apostles (10-40 days), the Fast of the Prophets (43 days), and the Fast of Nineveh (3 days).</li><li>During fasting periods, adherents abstain from all animal products (meat, dairy, eggs) and generally eat only one meal per day, after 3 pm or after the liturgy is complete.</li><li>Wednesday and Friday are regular weekly fasting days throughout the year.</li></ul><p>This extensive fasting tradition exceeds what is typical in Eastern Orthodox churches and is considered a profound expression of devotion and spiritual discipline in the Ethiopian tradition.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Spiritual Practices",
    tags: "fasting,traditions,spiritual discipline"
  },
  // Answer for tabot question
  {
    questionId: 3,
    content: "<p>The tabot holds profound significance in the Ethiopian Orthodox tradition and is the most sacred object in the church. Here's an explanation of its importance:</p><ul><li>The tabot is a consecrated wooden tablet that represents the Ark of the Covenant and the Tablets of Law given to Moses.</li><li>Every Ethiopian Orthodox church must have a tabot to be considered consecrated, as it represents the divine presence of God.</li><li>Only ordained priests may touch the tabot, and it is typically kept hidden from public view in the church's inner sanctuary (Holy of Holies or Meqdes).</li><li>During the annual Timkat (Epiphany) celebration, the tabot is removed from the church, wrapped in ornate cloth, and carried in procession to water, symbolizing Christ's baptism in the Jordan River.</li></ul><p>The centrality of the tabot in Ethiopian Orthodoxy reflects Ethiopia's historical connection to ancient Israel and the belief that the original Ark of the Covenant resides in Axum, Ethiopia. This belief is foundational to Ethiopian Orthodox identity and represents the covenant relationship between God and the Ethiopian people.</p>",
    author: "Church Scholar",
    isRichText: true,
    category: "Church Architecture",
    tags: "tabot,ark of covenant,sacred objects"
  },
  // Answer for Trinity question
  {
    questionId: 4,
    content: "<p>The Ethiopian Orthodox Tewahedo Church holds a traditional understanding of the Holy Trinity that aligns with ancient Christian formulations while incorporating unique cultural expressions. Key aspects include:</p><ul><li>The Church fully affirms the Nicene-Constantinopolitan understanding of the Trinity: one God in three persons (Father, Son, and Holy Spirit), consubstantial and co-eternal.</li><li>The term 'Tewahedo' itself (meaning 'unified' or 'made one') primarily refers to Christology but reflects the Church's emphasis on divine unity within the Trinity.</li><li>Ethiopian Orthodox iconography often depicts the Trinity in distinctive ways, such as three identical figures or three faces on one head, emphasizing their unity of essence.</li><li>The liturgy contains numerous Trinitarian doxologies and prayers, with frequent use of three-fold repetitions.</li></ul><p>A distinctive feature of Ethiopian Orthodox Trinitarian expression is found in religious poetry (especially the Mezmurat or hymns), which uses rich analogies from nature and daily life to express the mystery of the Three-in-One. The Trinity is commonly compared to the sun (one entity with light, heat, and the orb itself) in Ethiopian theological teaching.</p>",
    author: "Deacon Tewodros",
    isRichText: true,
    category: "Theology",
    tags: "trinity,doctrine,theology"
  },
  // Answer for saints question
  {
    questionId: 5,
    content: "<p>Saint veneration is richly developed in the Ethiopian Orthodox tradition, featuring both universal Christian saints and uniquely Ethiopian holy figures. Key aspects include:</p><ul><li>The Virgin Mary (known as Mariam) holds supreme veneration, with numerous feast days and a special monthly commemoration.</li><li>The Nine Saints (ተስዓቱ ቅዱሳን) who came from Syria in the 5th-6th centuries are highly venerated for establishing monasticism and spreading Christianity in Ethiopia.</li><li>Uniquely Ethiopian saints include Abune Tekle Haymanot, Yared (creator of sacred music), and King Lalibela (who built the famous rock-hewn churches).</li><li>St. George (Kidus Giorgis) has extraordinary popularity and is considered a patron saint of Ethiopia, with churches dedicated to him throughout the country.</li></ul><p>Ethiopian Orthodox saint veneration is distinguished by its integration with indigenous culture, resulting in distinctive iconography, feast celebrations, and devotional practices. Saints' stories are preserved in the Synaxarium (Senkessar) and frequently commemorated during the liturgy. Many Ethiopian saints are associated with miraculous healings, and their relics and burial places are important pilgrimage sites.</p>",
    author: "Church Scholar",
    isRichText: true,
    category: "Saints",
    tags: "saints,veneration,Ethiopian saints"
  },
  // Answer for Christology question
  {
    questionId: 6,
    content: "<p>The Ethiopian Orthodox Tewahedo Church holds to miaphysite Christology, which is central to its theological identity. Here's an explanation of this position:</p><ul><li>The term 'Tewahedo' means 'unified' or 'made one,' referring to the belief in the perfect union of Christ's divinity and humanity.</li><li>Ethiopian Orthodox Christology affirms that after the Incarnation, Christ has one united nature (miaphysis) that is both fully divine and fully human, without separation, confusion, alteration, or division.</li><li>This differs from Chalcedonian Christology (of Eastern Orthodox and Catholic traditions), which describes Christ as having two natures (divine and human) in one person.</li><li>The Ethiopian Church rejected the Council of Chalcedon (451 CE) alongside other Oriental Orthodox churches, viewing its formulation as potentially undermining the complete unity of Christ.</li></ul><p>It's important to note that modern ecumenical dialogues have recognized that both traditions affirm the fullness of Christ's humanity and divinity, with differences being largely terminological rather than substantive. The Ethiopian emphasis on unity reflects a deeply held conviction that salvation requires the complete union of humanity with divinity in the person of Christ.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Theology",
    tags: "christology,doctrine,miaphysitism"
  },
  // Answer for cross designs question
  {
    questionId: 7,
    content: "<p>Ethiopian Orthodox crosses are among the most distinctive and elaborate in Christian tradition, rich with symbolism and meaning:</p><ul><li>The interlaced patterns in Ethiopian crosses often represent eternity and the infinite nature of God, with no beginning or end.</li><li>Most Ethiopian crosses feature equal-length arms, sometimes with flared ends, symbolizing the light of Christ spreading in all directions.</li><li>Many designs include a net-like or lattice pattern, representing Christ as the fisher of men or the concept of salvation.</li><li>The number of points or decorative elements often has specific meaning: twelve points for the apostles, four for the evangelists, or three representing the Trinity.</li></ul><p>Different regions of Ethiopia have developed their own distinctive cross styles. For example, the Lalibela region is known for processional crosses with circular or semi-circular patterns, while Axum is known for hand crosses with geometric precision. The cross design tradition continues to evolve, with contemporary artisans creating new variations while maintaining traditional symbolism.</p><p>Beyond being religious symbols, these crosses serve as powerful cultural identifiers and artistic expressions that have become emblematic of Ethiopian Christian identity worldwide.</p>",
    author: "Art Historian",
    isRichText: true,
    category: "Art and Symbolism",
    tags: "crosses,art,symbolism"
  },
  // Answer for ordination question
  {
    questionId: 8,
    content: "<p>The ordination process in the Ethiopian Orthodox Tewahedo Church follows ancient traditions with specific requirements:</p><ul><li>Deacons (Diyakon) are typically ordained from a young age (often as children), beginning their service as assistants in the liturgy. They must memorize liturgical texts and learn sacred chants.</li><li>To become a priest (Qes), a candidate must:</li><ul><li>Be at least 30 years of age</li><li>Demonstrate thorough knowledge of liturgical practices and scriptural texts</li><li>Be married (prior to ordination, as priests cannot marry after ordination)</li><li>Be recommended by the community and ecclesiastical authorities</li><li>Pass examinations on theology, liturgy, and church canons</li></ul><li>If a priest's wife dies, he cannot remarry but may become a monk. Some priests choose celibacy from the beginning and live a more ascetic life.</li></ul><p>The ordination ceremony involves the laying on of hands by a bishop, anointment, and investing with clerical vestments. Education traditionally occurred through the church school system (beginning with memorization of Ge'ez texts, often without understanding their meaning), though formal theological seminaries now exist alongside traditional training.</p><p>A distinctive feature of Ethiopian Orthodox priesthood is the combination of formalized ritual knowledge with the practical care of the parish community. Priests are deeply integrated into community life, serving not only as liturgical leaders but as counselors, mediators, and guardians of tradition.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Clergy",
    tags: "ordination,priesthood,vocations"
  },
  // Answer for sacraments question
  {
    questionId: 9,
    content: "<p>The Ethiopian Orthodox Tewahedo Church recognizes seven sacraments (mysteries or ምሥጢራት/mist'irat). Here's how they are practiced:</p><ul><li><strong>Baptism (ጥምቀት/T'imqet)</strong>: Performed through triple immersion, typically 40 days after birth for boys and 80 days for girls. Adults undergo a period of catechesis before baptism.</li><li><strong>Confirmation (ክርስትና/Kristina)</strong>: Administered immediately after baptism through anointing with holy myron (oil).</li><li><strong>Eucharist (ቅዱስ ቁርባን/Qidus Qurban)</strong>: The central sacrament, believed to be the true body and blood of Christ. Communicants must be baptized, confirmed, and in a state of ritual purity. Preparation includes fasting from the previous evening.</li><li><strong>Penance (ንስሐ/Nisiha)</strong>: Confession is made to a priest who assigns appropriate penance and offers absolution.</li><li><strong>Holy Orders (ክህነት/Kihinet)</strong>: Ordination to the various ranks of ministry, conferred by a bishop through the laying on of hands.</li><li><strong>Matrimony (ጋብቻ/Gabcha)</strong>: A solemn covenant blessed by the Church; divorce is permitted only under specific circumstances.</li><li><strong>Unction of the Sick (የሕመምተኞች ቅብዓት)</strong>: Anointing with oil for healing of body and soul.</li></ul><p>Distinctive features of Ethiopian sacramental practice include the use of the tabot (altar tablet) in the Eucharistic liturgy, the prominence of Ge'ez language in sacramental formulas, and elaborate ritual elements that reflect the church's ancient traditions. Most Ethiopian Orthodox churches celebrate the Divine Liturgy only in the morning hours, and communion is typically offered with a spoon directly into the mouth of the faithful.</p>",
    author: "Deacon Tewodros",
    isRichText: true,
    category: "Sacraments",
    tags: "baptism,eucharist,holy mysteries"
  },
  // Answer for afterlife question 
  {
    questionId: 10,
    content: "<p>The Ethiopian Orthodox Tewahedo Church holds traditional Christian views on the afterlife with some distinctive emphases:</p><ul><li>Upon death, the soul undergoes a particular judgment determining its immediate state of blessing or suffering.</li><li>The righteous souls rest in a state of preliminary bliss (often described as Abraham's Bosom or Paradise), while the unrighteous experience preliminary suffering.</li><li>A distinctive feature is the belief in toll-houses (መቅሠፍት/meqseft), where demons challenge the soul's passage based on sins committed in life, countered by angels defending the soul.</li><li>The Church strongly emphasizes prayer for the dead, believing intercession can improve the condition of souls awaiting the final judgment.</li><li>The Fetha Nagast (Law of Kings) contains detailed teachings about the intermediate state of souls.</li></ul><p>On the Last Day, the Ethiopian Orthodox Church teaches the general resurrection of all people, followed by Christ's final judgment. The righteous will inherit eternal glory in the renewed heaven and earth, while the unrighteous face eternal separation from God.</p><p>Distinctive practices related to these beliefs include elaborate funeral services, commemoration of the dead on the 3rd, 7th, 40th days and annually after death, and the major feast of Tazkar (memorial) services. The Church calendar includes several days dedicated to all departed souls when special prayers are offered.</p>",
    author: "Father Yohannes",
    isRichText: true,
    category: "Afterlife",
    tags: "heaven,hell,prayer for dead"
  },
  // Answer for liturgical languages question
  {
    questionId: 11,
    content: "<p>The linguistic landscape of Ethiopian Orthodox worship is rich and layered, balancing ancient tradition with accessibility:</p><ul><li><strong>Ge'ez</strong> remains the primary liturgical language, especially for the Eucharistic liturgy (Qeddase) and other sacramental texts. It is an ancient Semitic language that ceased to be spoken conversationally around the 10th-14th centuries but continues as a sacred language similar to Latin in Roman Catholicism.</li><li><strong>Amharic</strong> is increasingly used for sermons, Scripture readings, and congregational prayers to ensure understanding. In many churches, the Scriptures are read first in Ge'ez (maintaining tradition) and then in Amharic (for comprehension).</li><li><strong>Local languages</strong> such as Tigrinya, Oromo, and others are now utilized in regions where these are the primary spoken languages, particularly for preaching and teaching.</li></ul><p>The preservation of Ge'ez in worship serves several important purposes:</p><ul><li>It maintains historical continuity with the ancient church</li><li>It preserves the precise theological formulations of the early church fathers</li><li>It fosters a sense of the sacred and transcendent in worship</li><li>It serves as a unifying element across different regions and language groups</li></ul><p>In recent decades, there has been an increased effort to teach Ge'ez to clergy and interested laity, ensuring the language's survival. Meanwhile, the gradual incorporation of vernacular languages represents an adaptation to contemporary needs while maintaining the core traditional elements of worship.</p>",
    author: "Linguistic Scholar",
    isRichText: true,
    category: "Liturgy",
    tags: "Ge'ez,languages,worship"
  },
];

// Connect to the database
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

const db = drizzle(pool);

async function addSampleQuestions() {
  console.log("Starting to add sample questions and answers...");
  
  try {
    const schema = await import('../shared/schema.js');
    const { questions, answers } = schema;
    
    // Get existing questions to avoid duplicates
    const existingQuestions = await db.select().from(questions);
    const existingTitles = new Set(existingQuestions.map(q => q.title));
    
    let questionCount = 0;
    let answerCount = 0;
    
    // Process questions
    for (const [index, questionData] of sampleQuestions.entries()) {
      // Skip if title already exists
      if (existingTitles.has(questionData.title)) {
        console.log(`Question "${questionData.title}" already exists, skipping.`);
        continue;
      }
      
      // Calculate a new incremented ID
      const newId = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.id)) + 1 + questionCount 
        : 2 + questionCount;
      
      // Add votes and answers count for realism
      const votes = Math.floor(Math.random() * 20);
      const commentCount = Math.floor(Math.random() * 5);
      
      // Prepare question data
      const insertData = {
        id: newId,
        title: questionData.title,
        content: questionData.content,
        author: questionData.author,
        date: new Date(),
        status: questionData.status || "published",
        votes: votes,
        answers: 0, // Will be updated after adding answers
        comments: commentCount,
        category: questionData.category || null,
        tags: questionData.tags || null
      };
      
      // Insert question
      const [insertedQuestion] = await db.insert(questions).values(insertData).returning();
      console.log(`Added question: ${insertedQuestion.title} (ID: ${insertedQuestion.id})`);
      questionCount++;
      
      // Find matching answer for this question (if index + 2 matches questionId in sampleAnswers)
      const matchingAnswer = sampleAnswers.find(a => a.questionId === index + 2);
      
      if (matchingAnswer) {
        // Update the questionId to match the newly created question
        const answerData = {
          questionId: insertedQuestion.id,
          content: matchingAnswer.content,
          author: matchingAnswer.author,
          isRichText: true,
          date: new Date(),
          votes: Math.floor(Math.random() * 10),
          category: matchingAnswer.category,
          tags: matchingAnswer.tags
        };
        
        // Insert answer
        const [insertedAnswer] = await db.insert(answers).values(answerData).returning();
        console.log(`Added answer for question ID ${insertedQuestion.id}`);
        answerCount++;
        
        // Update the question to show it has an answer
        await db.update(questions)
          .set({ answers: 1 })
          .where(eq(questions.id, insertedQuestion.id));
      }
    }
    
    console.log(`Successfully added ${questionCount} questions and ${answerCount} answers.`);
  } catch (error) {
    console.error("Error adding sample questions:", error);
  } finally {
    await pool.end();
  }
}

// Execute the function
addSampleQuestions();