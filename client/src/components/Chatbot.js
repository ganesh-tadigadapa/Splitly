import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { API, Icon } from "../ui";

const SUGGESTIONS = ["Who owes the most right now?", "What was the biggest expense?", "Summarize spending in this group"];

function Chatbot({ open, onClose, groupId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // fresh conversation per group
  useEffect(() => {
    setMessages([]);
  }, [groupId]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages((prev) => [...prev, { sender: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/chat`, { message: msg, groupId });
      setMessages((prev) => [...prev, { sender: "ai", text: res.data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: "I couldn't reach the assistant just now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="assistant" role="dialog" aria-label="AI assistant">
        <div className="assistant-head">
          <div>
            <strong>Ask AI</strong>
            <small>Answers based on {groupId}</small>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close assistant">
            <Icon name="x" />
          </button>
        </div>

        <div className="assistant-log">
          <div className="bubble ai">
            Ask about balances, who paid for what, or where the money went in <b>{groupId}</b>.
          </div>
          {messages.length === 0 && (
            <div className="suggestions">
              <span className="suggestions-label">Try asking</span>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>
                  {s}
                  <Icon name="arrowRight" size={14} />
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.sender}`}>
              {m.text}
            </div>
          ))}
          {loading && (
            <div className="bubble ai" aria-label="Thinking">
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="assistant-input"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            ref={inputRef}
            className="input"
            type="text"
            value={input}
            placeholder="Ask a question…"
            onChange={(e) => setInput(e.target.value)}
            aria-label="Message"
          />
          <button className="btn btn-primary" type="submit" disabled={loading || !input.trim()} aria-label="Send">
            <Icon name="send" size={16} />
          </button>
        </form>
      </div>
    </>
  );
}

export default Chatbot;
