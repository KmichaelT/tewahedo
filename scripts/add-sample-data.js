// This script adds sample questions and answers directly via the API
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:5000';

// Sample questions with theological content about Ethiopian Orthodox topics
const questions = [
  {
    "title": "What is the role of fasting in the Ethiopian Orthodox Tewahedo tradition?",
    "content": "<p>I'm interested in learning about the fasting traditions of the Ethiopian Orthodox Tewahedo Church. How many fasting days are there in the year? What are the rules during fasting periods? And how does this compare to fasting in other Orthodox traditions?</p>",
    "author": "NewBeliever23",
    "category": "Spiritual Practices",
    "tags": "fasting,traditions,spiritual discipline"
  },
  {
    "title": "What is the significance of the tabot in Ethiopian Orthodox churches?",
    "content": "<p>I've read that Ethiopian Orthodox churches contain a tabot, which is a replica of the Ark of the Covenant. What is the spiritual and historical significance of the tabot? How is it used in worship, and why is it so central to Ethiopian Orthodox tradition?</p>",
    "author": "HistoryExplorer",
    "category": "Church Architecture",
    "tags": "tabot,ark of covenant,sacred objects"
  },
  {
    "title": "How does the Ethiopian Orthodox Church view the Holy Trinity?",
    "content": "<p>I'm studying different Christian denominations' understanding of the Trinity. Could someone explain the Ethiopian Orthodox Tewahedo Church's theological position on the Holy Trinity? Are there any unique aspects or emphases in how the Trinity is understood?</p>",
    "author": "TheologyStudent",
    "category": "Theology",
    "tags": "trinity,doctrine,theology"
  },
  {
    "title": "What saints are particularly venerated in the Ethiopian Orthodox tradition?",
    "content": "<p>I'm curious about which saints hold special importance in the Ethiopian Orthodox Tewahedo Church. Are there saints who are uniquely Ethiopian? How does saint veneration differ from other Orthodox traditions?</p>",
    "author": "FaithJourney",
    "category": "Saints",
    "tags": "saints,veneration,Ethiopian saints"
  },
  {
    "title": "Can someone explain the Ethiopian Orthodox position on Christology?",
    "content": "<p>I understand that the Ethiopian Orthodox Church is part of the Oriental Orthodox family and holds to miaphysite Christology. Could someone explain this theological position in detail? How does it differ from Chalcedonian Christology of Eastern Orthodox and Catholic churches?</p>",
    "author": "TheologyBuff",
    "category": "Theology",
    "tags": "christology,doctrine,miaphysitism"
  }
];

// Sample answers related to the questions
const answers = [
  {
    "questionTitle": "What is the role of fasting in the Ethiopian Orthodox Tewahedo tradition?",
    "content": "<p>Fasting is a central spiritual discipline in the Ethiopian Orthodox Tewahedo Church, with more fasting days than perhaps any other Christian tradition. Here are the key aspects:</p><ul><li>Ethiopian Orthodox Christians observe approximately 180-250 fasting days per year, depending on one's level of piety and observance.</li><li>The main fasting periods include the 55-day Fast of Lent (Hudade or Abiy Tsom), the Fast of the Apostles (10-40 days), the Fast of the Prophets (43 days), and the Fast of Nineveh (3 days).</li><li>During fasting periods, adherents abstain from all animal products (meat, dairy, eggs) and generally eat only one meal per day, after 3 pm or after the liturgy is complete.</li><li>Wednesday and Friday are regular weekly fasting days throughout the year.</li></ul><p>This extensive fasting tradition exceeds what is typical in Eastern Orthodox churches and is considered a profound expression of devotion and spiritual discipline in the Ethiopian tradition.</p>",
    "author": "Father Yohannes",
    "category": "Spiritual Practices",
    "tags": "fasting,traditions,spiritual discipline"
  },
  {
    "questionTitle": "What is the significance of the tabot in Ethiopian Orthodox churches?",
    "content": "<p>The tabot holds profound significance in the Ethiopian Orthodox tradition and is the most sacred object in the church. Here's an explanation of its importance:</p><ul><li>The tabot is a consecrated wooden tablet that represents the Ark of the Covenant and the Tablets of Law given to Moses.</li><li>Every Ethiopian Orthodox church must have a tabot to be considered consecrated, as it represents the divine presence of God.</li><li>Only ordained priests may touch the tabot, and it is typically kept hidden from public view in the church's inner sanctuary (Holy of Holies or Meqdes).</li><li>During the annual Timkat (Epiphany) celebration, the tabot is removed from the church, wrapped in ornate cloth, and carried in procession to water, symbolizing Christ's baptism in the Jordan River.</li></ul><p>The centrality of the tabot in Ethiopian Orthodoxy reflects Ethiopia's historical connection to ancient Israel and the belief that the original Ark of the Covenant resides in Axum, Ethiopia. This belief is foundational to Ethiopian Orthodox identity and represents the covenant relationship between God and the Ethiopian people.</p>",
    "author": "Church Scholar",
    "category": "Church Architecture",
    "tags": "tabot,ark of covenant,sacred objects"
  },
  {
    "questionTitle": "How does the Ethiopian Orthodox Church view the Holy Trinity?",
    "content": "<p>The Ethiopian Orthodox Tewahedo Church holds a traditional understanding of the Holy Trinity that aligns with ancient Christian formulations while incorporating unique cultural expressions. Key aspects include:</p><ul><li>The Church fully affirms the Nicene-Constantinopolitan understanding of the Trinity: one God in three persons (Father, Son, and Holy Spirit), consubstantial and co-eternal.</li><li>The term 'Tewahedo' itself (meaning 'unified' or 'made one') primarily refers to Christology but reflects the Church's emphasis on divine unity within the Trinity.</li><li>Ethiopian Orthodox iconography often depicts the Trinity in distinctive ways, such as three identical figures or three faces on one head, emphasizing their unity of essence.</li><li>The liturgy contains numerous Trinitarian doxologies and prayers, with frequent use of three-fold repetitions.</li></ul><p>A distinctive feature of Ethiopian Orthodox Trinitarian expression is found in religious poetry (especially the Mezmurat or hymns), which uses rich analogies from nature and daily life to express the mystery of the Three-in-One. The Trinity is commonly compared to the sun (one entity with light, heat, and the orb itself) in Ethiopian theological teaching.</p>",
    "author": "Deacon Tewodros",
    "category": "Theology",
    "tags": "trinity,doctrine,theology"
  },
  {
    "questionTitle": "What saints are particularly venerated in the Ethiopian Orthodox tradition?",
    "content": "<p>Saint veneration is richly developed in the Ethiopian Orthodox tradition, featuring both universal Christian saints and uniquely Ethiopian holy figures. Key aspects include:</p><ul><li>The Virgin Mary (known as Mariam) holds supreme veneration, with numerous feast days and a special monthly commemoration.</li><li>The Nine Saints (ተስዓቱ ቅዱሳን) who came from Syria in the 5th-6th centuries are highly venerated for establishing monasticism and spreading Christianity in Ethiopia.</li><li>Uniquely Ethiopian saints include Abune Tekle Haymanot, Yared (creator of sacred music), and King Lalibela (who built the famous rock-hewn churches).</li><li>St. George (Kidus Giorgis) has extraordinary popularity and is considered a patron saint of Ethiopia, with churches dedicated to him throughout the country.</li></ul><p>Ethiopian Orthodox saint veneration is distinguished by its integration with indigenous culture, resulting in distinctive iconography, feast celebrations, and devotional practices. Saints' stories are preserved in the Synaxarium (Senkessar) and frequently commemorated during the liturgy. Many Ethiopian saints are associated with miraculous healings, and their relics and burial places are important pilgrimage sites.</p>",
    "author": "Church Scholar",
    "category": "Saints",
    "tags": "saints,veneration,Ethiopian saints"
  },
  {
    "questionTitle": "Can someone explain the Ethiopian Orthodox position on Christology?",
    "content": "<p>The Ethiopian Orthodox Tewahedo Church holds to miaphysite Christology, which is central to its theological identity. Here's an explanation of this position:</p><ul><li>The term 'Tewahedo' means 'unified' or 'made one,' referring to the belief in the perfect union of Christ's divinity and humanity.</li><li>Ethiopian Orthodox Christology affirms that after the Incarnation, Christ has one united nature (miaphysis) that is both fully divine and fully human, without separation, confusion, alteration, or division.</li><li>This differs from Chalcedonian Christology (of Eastern Orthodox and Catholic traditions), which describes Christ as having two natures (divine and human) in one person.</li><li>The Ethiopian Church rejected the Council of Chalcedon (451 CE) alongside other Oriental Orthodox churches, viewing its formulation as potentially undermining the complete unity of Christ.</li></ul><p>It's important to note that modern ecumenical dialogues have recognized that both traditions affirm the fullness of Christ's humanity and divinity, with differences being largely terminological rather than substantive. The Ethiopian emphasis on unity reflects a deeply held conviction that salvation requires the complete union of humanity with divinity in the person of Christ.</p>",
    "author": "Father Yohannes",
    "category": "Theology",
    "tags": "christology,doctrine,miaphysitism"
  }
];

// Helper function to make API requests
async function makeRequest(url, method, data) {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return await response.json();
  } catch (error) {
    console.error(`Error making request to ${url}:`, error);
    return null;
  }
}

// Add sample questions and answers
async function addSampleData() {
  console.log('Starting to add sample questions and answers...');
  
  // Get existing questions to avoid duplicates
  const existingQuestions = await makeRequest('/api/questions', 'GET');
  const existingTitles = new Set(existingQuestions.map(q => q.title));
  
  // Keep track of newly created questions
  const createdQuestions = [];
  
  // Add questions
  for (const question of questions) {
    if (existingTitles.has(question.title)) {
      console.log(`Question "${question.title}" already exists, skipping.`);
      continue;
    }
    
    // Add random votes
    const questionWithVotes = {
      ...question,
      status: 'published',
      votes: Math.floor(Math.random() * 20)
    };
    
    const newQuestion = await makeRequest('/api/admin/questions', 'POST', questionWithVotes);
    if (newQuestion) {
      console.log(`Added question: ${newQuestion.title} (ID: ${newQuestion.id})`);
      createdQuestions.push(newQuestion);
    }
  }
  
  // Add answers to newly created questions
  for (const question of createdQuestions) {
    const matchingAnswer = answers.find(a => a.questionTitle === question.title);
    
    if (matchingAnswer) {
      const answerData = {
        questionId: question.id,
        content: matchingAnswer.content,
        author: matchingAnswer.author,
        isRichText: true,
        category: matchingAnswer.category,
        tags: matchingAnswer.tags
      };
      
      const newAnswer = await makeRequest('/api/admin/answers', 'POST', answerData);
      if (newAnswer) {
        console.log(`Added answer for question: ${question.title}`);
      }
    }
  }
  
  console.log('Finished adding sample data!');
}

// Run the function
addSampleData();