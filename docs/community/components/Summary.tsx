import React from "react";

export default function Summary({ summary, style }) {
    return (
        <div
            style={{
                ...style,
            }}
        >
            {summary}
        </div>
    );
}
