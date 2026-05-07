import { useState } from "react";

function AiTestPage() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError("");
    setOutput("");

    try {
      const { geminiModel } = await import("../firebase/client.js");
      const result = await geminiModel.generateContent(
        `Answer this test prompt clearly and concisely:\n\n${trimmedPrompt}`,
      );
      setOutput(result.response.text());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The AI prompt could not be completed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="home-content ai-test-page" aria-labelledby="ai-test-title">
      <form className="ai-test-form" onSubmit={handleSubmit}>
        <div>
          <h2 id="ai-test-title">AI Test</h2>
          <p>Send one prompt and review the generated response.</p>
        </div>

        <label className="ai-prompt-field">
          Prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask the AI to summarize, rewrite, or explain something."
            rows={7}
          />
        </label>

        <button type="submit" disabled={isSubmitting || !prompt.trim()}>
          {isSubmitting ? "Generating..." : "Submit prompt"}
        </button>

        <output className="ai-output" aria-live="polite">
          {error || output || "AI output will appear here after submitting."}
        </output>
      </form>
    </section>
  );
}

export default AiTestPage;
