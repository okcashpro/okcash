import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import "./App.css";
import { startAgent } from "./runtime";
import { character } from "./character";
import { stringToUuid } from "@ai16z/eliza";

type Agent = {
    id: string;
    name: string;
};

function Agents() {
    const navigate = useNavigate();
    const { data: agents, isLoading } = useQuery({
        queryKey: ["agents"],
        queryFn: async () => {
            // await startAgent(character)

            return [
                {
                    id: stringToUuid("foo"),
                    name: "foo",
                },
            ] as Agent[];
        },
    });

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold mb-8">Select your agent:</h1>

            {isLoading ? (
                <div>Loading agents...</div>
            ) : (
                <div className="grid gap-4 w-full max-w-md">
                    {agents?.map((agent) => (
                        <Button
                            key={agent.id}
                            className="w-full text-lg py-6"
                            onClick={() => {
                                navigate(`/${agent.id}`);
                            }}
                        >
                            {agent.name}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Agents;
