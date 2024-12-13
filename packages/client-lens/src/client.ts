import { IAgentRuntime, elizaLogger } from "@ai16z/eliza";
import {
    AnyPublicationFragment,
    LensClient as LensClientCore,
    LensTransactionStatusType,
    LimitType,
    NotificationType,
    ProfileFragment,
    PublicationType,
} from "@lens-protocol/client";
import { omit } from "lodash/object";
import { Profile, BroadcastResult } from "./types";
import { WalletClient } from "viem";
import { getProfilePictureUri, handleBroadcastResult } from "./utils";

export class LensClient {
    runtime: IAgentRuntime;
    core: LensClientCore;
    walletClient: WalletClient;
    cache: Map<string, any>;
    lastInteractionTimestamp: Date;
    profileId: `0x${string}`;

    private authenticated: boolean;
    private authenticatedProfile: ProfileFragment | null;

    constructor(opts: {
        runtime: IAgentRuntime;
        core: LensClientCore;
        walletClient: WalletClient;
        cache: Map<string, any>;
        profileId: `0x${string}`;
    }) {
        this.cache = opts.cache;
        this.runtime = opts.runtime;
        this.walletClient = opts.walletClient;
        this.core = opts.core;
        this.lastInteractionTimestamp = new Date();
        this.profileId = opts.profileId;
        this.authenticated = false;
        this.authenticatedProfile = null;
    }

    async authenticate(): Promise<boolean> {
        try {
            const [address] = await this.walletClient.getAddresses();
            const { id, text } =
                await this.core.authentication.generateChallenge({
                    signedBy: address,
                    for: this.profileId,
                });

            const signature = await this.walletClient.signMessage({
                account: address,
                message: text,
            });

            await this.core.authentication.authenticate({ id, signature });
            this.authenticatedProfile = await this.core.profile.fetch({
                forProfileId: this.profileId,
            });

            this.authenticated = true;
            return true;
        } catch (error) {
            elizaLogger.error("client-lens::client error: ", error);
            throw error;
        }

        return false;
    }

    async createPublication(
        contentURI: string,
        onchain: boolean = false,
        commentOn?: string
    ): Promise<AnyPublicationFragment | null | undefined> {
        if (!this.authenticated) {
            await this.authenticate();
        }
        let broadcastResult;
        try {
            if (commentOn) {
                broadcastResult = onchain
                    ? await this.createCommentOnchain(contentURI, commentOn)
                    : await this.createCommentOnchain(contentURI, commentOn);
            }

            broadcastResult = onchain
                ? await this.createPostOnchain(contentURI)
                : await this.createPostMomoka(contentURI);

            const completion = await this.core.transaction.waitUntilComplete({
                forTxId: broadcastResult.txId,
            });

            if (completion?.status === LensTransactionStatusType.Complete) {
                return await this.core.publication.fetch({
                    forTxHash: completion?.txHash,
                });
            }
        } catch (error) {
            elizaLogger.error("client-lens::client error: ", error);
            throw error;
        }
    }

    async getPublication(
        pubId: string
    ): Promise<AnyPublicationFragment | null> {
        if (this.cache.has(`lens/publication/${pubId}`)) {
            return this.cache.get(`lens/publication/${pubId}`);
        }

        const publication = await this.core.publication.fetch({ forId: pubId });

        if (publication)
            this.cache.set(`lens/publication/${pubId}`, publication);

        return publication;
    }

    async getPublicationsFor(
        profileId: string,
        limit: number = 50
    ): Promise<AnyPublicationFragment[]> {
        const timeline: AnyPublicationFragment[] = [];
        let next: any | undefined = undefined;

        do {
            const { items, next: newNext } = next
                ? await next()
                : await this.core.publication.fetchAll({
                      limit: LimitType.Fifty,
                      where: {
                          from: [profileId],
                          publicationTypes: [PublicationType.Post],
                      },
                  });

            items.forEach((publication) => {
                this.cache.set(
                    `lens/publication/${publication.id}`,
                    publication
                );
                timeline.push(publication);
            });

            next = newNext;
        } while (next && timeline.length < limit);

        return timeline;
    }

    async getMentions(): Promise<{
        mentions: AnyPublicationFragment[];
        next: () => {};
    }> {
        if (!this.authenticated) {
            await this.authenticate();
        }
        const result = await this.core.notifications.fetch({
            where: {
                highSignalFilter: true,
                notificationTypes: [
                    NotificationType.Mentioned,
                    NotificationType.Commented,
                ],
            },
        });
        const mentions: AnyPublicationFragment[] = [];

        const { items, next } = result.unwrap();

        items.map((notification) => {
            // @ts-ignore NotificationFragment
            const item = notification.publication || notification.comment;
            mentions.push(item);
            this.cache.set(`lens/publication/${item.id}`, item);
        });

        return { mentions, next };
    }

    async getProfile(profileId: string): Promise<Profile> {
        if (this.cache.has(`lens/profile/${profileId}`)) {
            return this.cache.get(`lens/profile/${profileId}`) as Profile;
        }

        const result = await this.core.profile.fetch({
            forProfileId: profileId,
        });
        if (!result?.id) {
            elizaLogger.error("Error fetching user by profileId");

            throw "getProfile ERROR";
        }

        const profile: Profile = {
            id: "",
            profileId,
            name: "",
            handle: "",
        };

        profile.id = result.id;
        profile.name = result.metadata?.displayName;
        profile.handle = result.handle?.localName;
        profile.bio = result.metadata?.bio;
        profile.pfp = getProfilePictureUri(result.metadata?.picture);

        this.cache.set(`lens/profile/${profileId}`, profile);

        return profile;
    }

    async getTimeline(
        profileId: string,
        limit: number = 50
    ): Promise<AnyPublicationFragment[]> {
        if (!this.authenticated) {
            await this.authenticate();
        }
        const timeline: AnyPublicationFragment[] = [];
        let next: any | undefined = undefined;

        do {
            const result = next
                ? await next()
                : await this.core.feed.highlights({
                      where: {
                          for: profileId,
                      },
                  });

            const data = result.unwrap();

            data.items.forEach((item) => {
                this.cache.set(`lens/publication/${item.id}`, item);
                timeline.push(item);
            });

            next = data.next;
        } while (next && timeline.length < limit);

        return timeline;
    }

    private async createPostOnchain(
        contentURI: string
    ): Promise<BroadcastResult | undefined> {
        // gasless + signless if they enabled the lens profile manager
        if (this.authenticatedProfile?.signless) {
            const broadcastResult = await this.core.publication.postOnchain({
                contentURI,
                openActionModules: [], // TODO: if collectable
            });
            return handleBroadcastResult(broadcastResult);
        }

        // gasless with signed type data
        const typedDataResult =
            await this.core.publication.createOnchainPostTypedData({
                contentURI,
                openActionModules: [], // TODO: if collectable
            });
        const { id, typedData } = typedDataResult.unwrap();

        const [account] = await this.walletClient.getAddresses();
        const signedTypedData = await this.walletClient.signTypedData({
            account,
            domain: omit(typedData.domain, "__typename"),
            types: omit(typedData.types, "__typename"),
            primaryType: "Post",
            message: omit(typedData.value, "__typename"),
        });

        const broadcastResult = await this.core.transaction.broadcastOnchain({
            id,
            signature: signedTypedData,
        });
        return handleBroadcastResult(broadcastResult);
    }

    private async createPostMomoka(
        contentURI: string
    ): Promise<BroadcastResult | undefined> {
        // gasless + signless if they enabled the lens profile manager
        if (this.authenticatedProfile?.signless) {
            const broadcastResult = await this.core.publication.postOnMomoka({
                contentURI,
            });
            return handleBroadcastResult(broadcastResult);
        }

        // gasless with signed type data
        const typedDataResult =
            await this.core.publication.createMomokaPostTypedData({
                contentURI,
            });
        const { id, typedData } = typedDataResult.unwrap();

        const [account] = await this.walletClient.getAddresses();
        const signedTypedData = await this.walletClient.signTypedData({
            account,
            domain: omit(typedData.domain, "__typename"),
            types: omit(typedData.types, "__typename"),
            primaryType: "Post",
            message: omit(typedData.value, "__typename"),
        });

        const broadcastResult = await this.core.transaction.broadcastOnMomoka({
            id,
            signature: signedTypedData,
        });
        return handleBroadcastResult(broadcastResult);
    }

    private async createCommentOnchain(
        contentURI: string,
        commentOn: string
    ): Promise<BroadcastResult | undefined> {
        // gasless + signless if they enabled the lens profile manager
        if (this.authenticatedProfile?.signless) {
            const broadcastResult = await this.core.publication.commentOnchain({
                commentOn,
                contentURI,
            });
            return handleBroadcastResult(broadcastResult);
        }

        // gasless with signed type data
        const typedDataResult =
            await this.core.publication.createOnchainCommentTypedData({
                commentOn,
                contentURI,
            });

        const { id, typedData } = typedDataResult.unwrap();

        const [account] = await this.walletClient.getAddresses();
        const signedTypedData = await this.walletClient.signTypedData({
            account,
            domain: omit(typedData.domain, "__typename"),
            types: omit(typedData.types, "__typename"),
            primaryType: "Comment",
            message: omit(typedData.value, "__typename"),
        });

        const broadcastResult = await this.core.transaction.broadcastOnchain({
            id,
            signature: signedTypedData,
        });
        return handleBroadcastResult(broadcastResult);
    }

    private async createCommentMomoka(
        contentURI: string,
        commentOn: string
    ): Promise<BroadcastResult | undefined> {
        // gasless + signless if they enabled the lens profile manager
        if (this.authenticatedProfile?.signless) {
            const broadcastResult = await this.core.publication.commentOnMomoka(
                {
                    commentOn,
                    contentURI,
                }
            );
            return handleBroadcastResult(broadcastResult);
        }

        // gasless with signed type data
        const typedDataResult =
            await this.core.publication.createMomokaCommentTypedData({
                commentOn,
                contentURI,
            });

        const { id, typedData } = typedDataResult.unwrap();

        const [account] = await this.walletClient.getAddresses();
        const signedTypedData = await this.walletClient.signTypedData({
            account,
            domain: omit(typedData.domain, "__typename"),
            types: omit(typedData.types, "__typename"),
            primaryType: "Comment",
            message: omit(typedData.value, "__typename"),
        });

        const broadcastResult = await this.core.transaction.broadcastOnMomoka({
            id,
            signature: signedTypedData,
        });
        return handleBroadcastResult(broadcastResult);
    }
}
