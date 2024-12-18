import { AwsS3Service } from "@okcashpro/plugin-node";
import {
    composeContext,
    okaiLogger,
    generateImage,
    getEmbeddingZeroVector,
    IAgentRuntime,
    Memory,
    ServiceType,
    stringToUuid,
} from "@okcashpro/okai";
import {
    saveBase64Image,
    saveHeuristImage,
} from "@okcashpro/plugin-image-generation";
import { PublicKey } from "@solana/web3.js";
import WalletSolana from "../provider/wallet/walletSolana.ts";

const collectionImageTemplate = `
Generate a logo with the text "{{collectionName}}", using orange as the main color, with a sci-fi and mysterious background theme
`;

export async function createCollection({
    runtime,
    collectionName,
    fee,
}: {
    runtime: IAgentRuntime;
    collectionName: string;
    fee?: number;
}) {
    const userId = runtime.agentId;
    okaiLogger.log("User ID:", userId);
    const awsS3Service: AwsS3Service = runtime.getService(ServiceType.AWS_S3);
    const agentName = runtime.character.name;
    const roomId = stringToUuid("nft_generate_room-" + agentName);
    // Create memory for the message
    const memory: Memory = {
        agentId: userId,
        userId,
        roomId,
        content: {
            text: "",

            source: "nft-generator",
        },
        createdAt: Date.now(),
        embedding: getEmbeddingZeroVector(),
    };
    const state = await runtime.composeState(memory, {
        collectionName,
    });

    const prompt = composeContext({
        state,
        template: collectionImageTemplate,
    });
    const images = await generateImage(
        {
            prompt,
            width: 300,
            height: 300,
        },
        runtime
    );
    if (images.success && images.data && images.data.length > 0) {
        const image = images.data[0];
        const filename = `collection-image`;
        if (image.startsWith("http")) {
            okaiLogger.log("Generating image url:", image);
        }
        // Choose save function based on image data format
        const filepath = image.startsWith("http")
            ? await saveHeuristImage(image, filename)
            : saveBase64Image(image, filename);

        const logoPath = await awsS3Service.uploadFile(
            filepath,
            `/${collectionName}`,
            false
        );
        const publicKey = runtime.getSetting("SOLANA_PUBLIC_KEY");
        const privateKey = runtime.getSetting("SOLANA_PRIVATE_KEY");
        const adminPublicKey = runtime.getSetting("SOLANA_ADMIN_PUBLIC_KEY");
        const collectionInfo = {
            name: `${collectionName}`,
            symbol: `${collectionName.toUpperCase()[0]}`,
            adminPublicKey,
            fee: fee || 0,
            uri: "",
        };
        const jsonFilePath = await awsS3Service.uploadJson(
            {
                name: collectionInfo.name,
                description: `${collectionInfo.name}`,
                image: logoPath.url,
            },
            "metadata.json",
            `${collectionName}`
        );
        collectionInfo.uri = jsonFilePath.url;

        const wallet = new WalletSolana(new PublicKey(publicKey), privateKey);

        const collectionAddressRes = await wallet.createCollection({
            ...collectionInfo,
        });

        return {
            network: "solana",
            address: collectionAddressRes.address,
            link: collectionAddressRes.link,
            collectionInfo,
        };
    }

    return;
}
