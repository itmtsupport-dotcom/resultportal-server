
const { Setting, Student, Token, Result, Exam, Year, Class, Department, KnowledgeBase } = require("../models");
const { Op } = require("sequelize");

// Fallback Static Knowledge Base (in case DB is empty)
const staticKnowledgeBase = [
  {
    keywords: ["hello", "hi", "hey", "start", "greeting", "good morning", "good afternoon", "good evening"],
    response: "Hello 👋 I am the ITMT Assistant. I can help you check results, buy tokens, download result PDFs, and solve common problems."
  },
  {
    keywords: ["download", "pdf", "print", "save", "copy"],
    response: "Once you have viewed your result, you can download it as a PDF by clicking the 'Download PDF' button at the top right corner of the result page."
  },
  {
    keywords: ["buy", "purchase", "get", "token", "payment", "pay", "cost", "price", "how much"],
    response: "To buy a result token:\n1. Click the 'Buy Token' link on the login page.\n2. Enter your Registration Number and Email.\n3. Complete the payment securely via Paystack.\n4. Your token code will be sent to your email immediately.\nThe cost is determined by the school."
  },
  {
    keywords: ["contact", "support", "help", "admin", "office"],
    response: "You can contact the school administration for further assistance at support@itmt.edu.ng or visit the ICT center during school hours."
  }
];

// Helper to extract registration number
const extractRegNumber = (text) => {
  // Pattern for ITMT/CSC/0001 or similar variants
  const match = text.match(/(ITMT\/[a-zA-Z0-9\/]+)/i);
  return match ? match[0].toUpperCase() : null;
};

// Helper to extract token code
const extractTokenCode = (text) => {
  // Pattern for 16-char hex token or generic token format if known
  // Based on tokenService, it generates 16-char hex string (8 bytes)
  const match = text.match(/([A-F0-9]{16})/i);
  return match ? match[0].toUpperCase() : null;
};

const runDiagnostics = async (regNum, tokenCode) => {
  const diagnosis = [];
  
  try {
    // 1. Check Student
    let student = null;
    if (regNum) {
      student = await Student.findOne({ where: { registrationNumber: regNum } });
      if (!student) {
        return "I couldn't find a student with that Registration Number. Please double-check it.";
      }
      diagnosis.push(`✅ Student record found for ${student.fullName}`);
    } else {
        // If we have a token but no reg number, maybe we can find student via token?
        if (tokenCode) {
            const token = await Token.findOne({ where: { tokenCode } });
            if (token && token.studentId) {
                student = await Student.findByPk(token.studentId);
                if (student) {
                    diagnosis.push(`✅ Found student record via token: ${student.fullName}`);
                }
            }
        }
    }

    // 2. Check Token
    if (tokenCode) {
      const token = await Token.findOne({ where: { tokenCode } });
      if (!token) {
        return "The Token Code you provided does not exist in our system. Please check for typos.";
      }
      
      if (token.status === 'EXPIRED') {
        return "Your token has expired. Please purchase a new one.";
      }
      
      if (token.status === 'EXHAUSTED' || token.usageCount >= token.maxUsage) {
        return `Your token has reached its maximum usage limit (${token.maxUsage} times). You need to buy a new token.`;
      }
      
      if (token.status === 'DISABLED') {
        return "This token has been disabled by the administration. Please contact support.";
      }

      if (student && token.studentId && token.studentId !== student.id) {
        return "This token is linked to a different student. Tokens cannot be transferred between students.";
      }

      diagnosis.push(`✅ Token is valid (Used: ${token.usageCount}/${token.maxUsage})`);
    }

    // 3. Check Results (Only if we identified the student)
    if (student) {
      // Find latest published result for this student
      const result = await Result.findOne({ 
        where: { studentId: student.id, published: true },
        include: [
            { model: Exam, attributes: ['name'] },
            { model: Year, attributes: ['name'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      if (result) {
        diagnosis.push(`✅ Found a published result for ${result.Year.name} - ${result.Exam.name}.`);
        diagnosis.push("If you can't see it, please ensure you are selecting the correct Session and Exam on the result checker page.");
      } else {
        diagnosis.push("⚠️ No published results found for this student yet. It's possible they haven't been uploaded or approved.");
      }
    }

    if (diagnosis.length === 0) {
        return "I couldn't perform a full diagnosis. Please provide both your **Registration Number** and **Token Code**.";
    }

    return diagnosis.join("\n");

  } catch (error) {
    console.error("Diagnostics Error:", error);
    return "I encountered an error while checking the records. Please try again later.";
  }
};

const handleChatRequest = async (req, res, next) => {
  try {
    const { message, url } = req.body;
    
    // Page Context Awareness
    // If message is empty (e.g. initial load), provide context-based greeting
    if (!message && url) {
        let greeting = "Hello 👋 I am the ITMT Assistant. How can I help you today?";
        if (url.includes('/buy-token')) {
            greeting = "I see you are on the payment page. Do you need help buying a token? Just ask!";
        } else if (url.includes('/search')) {
            greeting = "I see you are checking your result. Make sure you enter your registration number and select the correct year, exam, and class.";
        } else if (url.includes('/result')) {
            greeting = "Need to download this result? Click the 'Download PDF' button at the top right. Let me know if you need anything else.";
        }
        return res.status(200).json({ response: greeting });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const lowerMessage = message.toLowerCase();
    
    // Check for diagnostic intent
    const diagnosticKeywords = ["not showing", "result problem", "token error", "invalid token", "check my status", "what is wrong", "help me check"];
    const isDiagnostic = diagnosticKeywords.some(k => lowerMessage.includes(k));

    // Extract entities
    const regNum = extractRegNumber(message);
    const tokenCode = extractTokenCode(message);

    // If user provides specific data, we assume they want a check, or if they explicitly asked for help
    if (isDiagnostic || (regNum || tokenCode)) {
        if (!regNum && !tokenCode) {
            return res.status(200).json({ 
                response: "I can help check why your result isn't showing. Please reply with your **Registration Number** and **Token Code**." 
            });
        }

        const diagnosticResult = await runDiagnostics(regNum, tokenCode);
        return res.status(200).json({ response: diagnosticResult });
    }

    // Dynamic Knowledge Base Search
    // 1. Fetch all active KB entries
    const dbKnowledge = await KnowledgeBase.findAll({ where: { isActive: true } });
    
    // 2. Combine with static fallback
    const allKnowledge = [...dbKnowledge.map(k => ({ 
        keywords: Array.isArray(k.keywords) ? k.keywords : [], 
        response: k.answer 
    })), ...staticKnowledgeBase];

    // 3. Find best match
    const match = allKnowledge.find(entry => 
      entry.keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
    );

    let responseText = match 
      ? match.response 
      : "I'm not sure I understand that clearly. You can ask me about:\n- Buying Tokens\n- Checking Results\n- Downloading PDFs\n- Common Errors\n\nOr provide your **Reg Number** and **Token** for a status check.";

    return res.status(200).json({ response: responseText });

  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ error: "Failed to process chat message" });
  }
};

// Admin API to Manage Knowledge Base
const listKnowledgeBase = async (req, res, next) => {
    try {
        const kb = await KnowledgeBase.findAll({ order: [['createdAt', 'DESC']] });
        return res.status(200).json(kb);
    } catch (error) {
        next(error);
    }
};

const createKnowledgeBaseEntry = async (req, res, next) => {
    try {
        const { question, answer, keywords, category } = req.body;
        const kb = await KnowledgeBase.create({
            question,
            answer,
            keywords: Array.isArray(keywords) ? keywords : [keywords],
            category: category || "General"
        });
        return res.status(201).json(kb);
    } catch (error) {
        next(error);
    }
};

const updateKnowledgeBaseEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const kb = await KnowledgeBase.findByPk(id);
        if (!kb) return res.status(404).json({ error: "Entry not found" });
        await kb.update(req.body);
        return res.status(200).json(kb);
    } catch (error) {
        next(error);
    }
};

const deleteKnowledgeBaseEntry = async (req, res, next) => {
    try {
        const { id } = req.params;
        const kb = await KnowledgeBase.findByPk(id);
        if (!kb) return res.status(404).json({ error: "Entry not found" });
        await kb.destroy();
        return res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    handleChatRequest,
    listKnowledgeBase,
    createKnowledgeBaseEntry,
    updateKnowledgeBaseEntry,
    deleteKnowledgeBaseEntry
};
