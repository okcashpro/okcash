export async function getOrCreateRecommenderInBe(
    recommenderId: string,
    username: string,
    backendToken: string,
    backend: string,
    retries = 3,
    delayMs = 2000
) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(
                `${backend}/api/updaters/getOrCreateRecommender`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${backendToken}`,
                    },
                    body: JSON.stringify({
                        recommenderId: recommenderId,
                        username: username,
                    }),
                }
            );
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(
                `Attempt ${attempt} failed: Error getting or creating recommender in backend`,
                error
            );
            if (attempt < retries) {
                console.log(`Retrying in ${delayMs} ms...`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            } else {
                console.error("All attempts failed.");
            }
        }
    }
}
