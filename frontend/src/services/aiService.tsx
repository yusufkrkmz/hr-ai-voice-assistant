export const generateAIResponse = async (userInput: string): Promise<{ answer: string; audio_url?: string }> => {
  try {
    const res = await fetch("http://localhost:3001/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: userInput }),
    });

    if (!res.ok) {
      throw new Error("Server error: " + res.status);
    }

    const data = await res.json();
    return {
      answer: data.answer || "No response received.",
      audio_url: data.audio_url,
    };
  } catch (err) {
    console.error("❌ Backend API hatası:", err);
    return {
      answer: "Sorry, I couldn’t process your request right now.",
    };
  }
};
