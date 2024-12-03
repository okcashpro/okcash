import React from "react";
import { StatCardProps } from "./Contributions";

export const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                backgroundColor: "white",
                borderRadius: "0.5rem",
                padding: "24px",
            }}
        >
            <div style={{ fontSize: "1rem", fontWeight: "bold" }}>{title}</div>
            <div style={{ fontSize: "1.5rem", marginTop: "8px" }}>{value}</div>
        </div>
    );
};
