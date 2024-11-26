import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "./App.css";
import { Account, IAgentRuntime, stringToUuid, UUID } from "@ai16z/eliza";
import { handleRoomMessage, startAgent } from "./runtime";
import { character } from "./character";

type TextResponse = {
    text: string;
    user: string;
};

export default function Chat() {
    const { agentId } = useParams();
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<TextResponse[]>([]);

    const [roomId] = useState(() => stringToUuid("test"));
    const [user] = useState(
        () =>
            ({
                id: stringToUuid("foo"),
                name: "foo",
                username: "foo",
            }) satisfies Account
    );

    const agent = useQuery({
        queryKey: ["agent", agentId],
        queryFn: async () => {
            return await startAgent(character);
        },
    });

    const mutation = useMutation({
        mutationFn: async ({
            agent,
            roomId,
            user,
            text,
        }: {
            agent: IAgentRuntime;
            roomId: UUID;
            user: Account;
            text: string;
        }): Promise<TextResponse[]> => {
            const responses = await handleRoomMessage(
                agent,
                roomId,
                user,
                text
            );
            return responses.map((response) => ({
                user: agent.character.name,
                text: response.text,
            }));
        },
        onSuccess: (data) => {
            setMessages((prev) => [...prev, ...data]);
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        if (!agent.data) return;
        // Add user message immediately to state
        const userMessage: TextResponse = {
            text: input,
            user: user.username,
        };
        setMessages((prev) => [...prev, userMessage]);

        mutation.mutate({
            agent: agent.data,
            roomId,
            text: input,
            user,
        });
        setInput("");
    };

    console.log({ agent });

    return (
        <div className="flex flex-col h-screen max-h-screen w-full">
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.length > 0 ? (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${
                                    message.user === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                }`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                        message.user === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                    }`}
                                >
                                    {message.text}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-muted-foreground">
                            No messages yet. Start a conversation!
                        </div>
                    )}
                </div>
            </div>

            <div className="border-t p-4 bg-background">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1"
                            disabled={mutation.isPending}
                        />
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? "..." : "Send"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
