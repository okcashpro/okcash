import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "./App.css";
import { stringToUuid } from "@ai16z/eliza";

type TextResponse = {
    text: string;
    user: string;
};

function App() {
    const [input, setInput] = useState("");
    const [response, setResponse] = useState<TextResponse[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/${stringToUuid("Eliza")}/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: input,
                    userId: "user",
                    roomId: `default-room-${stringToUuid("Eliza")}`,
                }),
            });

            const data: TextResponse[] = await res.json();

            console.log(data);
            setResponse(data);
            setInput("");
        } catch (error) {
            console.error("Error:", error);
            setResponse([{ text: "An error occurred", user: "system" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold mb-4">Chat with Eliza</h1>
            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your message..."
                    className="w-full"
                />
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending..." : "Send"}
                </Button>
            </form>

            {(loading || response) && (
                <div className="mt-8 p-4 w-full max-w-md bg-gray-100 rounded-lg">
                    {response.map((r) => (
                        <p key={r.text}>{r.text}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
