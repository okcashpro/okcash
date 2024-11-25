// In your router configuration file (e.g., App.jsx or router.jsx)
import { createBrowserRouter } from "react-router-dom";
import Agents from "./Agents";
import Agent from "./Agent"; // We'll create this component
import Layout from "./Layout";
import Chat from "./Chat";
import Character from "./Character";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Agents />,
    },
    {
        path: "/:agentId",
        element: <Layout />,
        children: [
            {
                path: "", // This matches /:agentId exactly
                element: <Agent />,
            },
            {
                path: "chat", // This matches /:agentId/chat
                element: <Chat />,
            },
            {
                path: "character", // This matches /:agentId/chat
                element: <Character />,
            },
        ],
    },
]);
