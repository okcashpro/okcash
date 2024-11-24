import { IAgentRuntime } from "@ai16z/eliza";
import { NeynarAPIClient, isApiErrorResponse } from "@neynar/nodejs-sdk";
import { NeynarCastResponse, Cast, Profile, FidRequest, CastId } from "./types";

export class FarcasterClient {
    runtime: IAgentRuntime;
    neynar: NeynarAPIClient;
    signerUuid: string;
    cache: Map<string, any>;
    lastInteractionTimestamp: Date;

    constructor(opts: {
        runtime: IAgentRuntime;
        url: string;
        ssl: boolean;
        neynar: NeynarAPIClient;
        signerUuid: string;
        cache: Map<string, any>;
    }) {
        this.cache = opts.cache;
        this.runtime = opts.runtime;
        this.neynar = opts.neynar;
        this.signerUuid = opts.signerUuid;
        this.lastInteractionTimestamp = new Date();
    }

    async loadCastFromNeynarResponse(neynarResponse: any): Promise<Cast> {
        const profile = await this.getProfile(neynarResponse.author.fid);
        return {
            hash: neynarResponse.hash,
            authorFid: neynarResponse.author.fid,
            text: neynarResponse.text,
            profile,
            ...(neynarResponse.parent_hash
                ? {
                      inReplyTo: {
                          hash: neynarResponse.parent_hash,
                          fid: neynarResponse.parent_author.fid,
                      },
                  }
                : {}),
            timestamp: new Date(neynarResponse.timestamp),
        };
    }

    async publishCast(
        cast: string,
        parentCastId: CastId | undefined,
        retryTimes?: number
    ): Promise<NeynarCastResponse | undefined> {
        try {
            const result = await this.neynar.publishCast({
                signerUuid: this.signerUuid,
                text: cast,
                parent: parentCastId?.hash,
            });
            if (result.success) {
                return {
                    hash: result.cast.hash,
                    authorFid: result.cast.author.fid,
                    text: result.cast.text,
                };
            }
        } catch (err) {
            if (isApiErrorResponse(err)) {
                console.log(err.response.data);
                throw err.response.data;
            } else {
                throw err;
                console.log(err);
            }
        }
    }

    async getCast(castHash: string): Promise<Cast> {
        if (this.cache.has(`farcaster/cast/${castHash}`)) {
            return this.cache.get(`farcaster/cast/${castHash}`);
        }

        const response = await this.neynar.lookupCastByHashOrWarpcastUrl({
            identifier: castHash,
            type: "hash",
        });
        const cast = {
            hash: response.cast.hash,
            //parentHash: cast.parent_hash,
            authorFid: response.cast.author.fid,
            text: response.cast.text,
            profile: {
                fid: response.cast.author.fid,
                name: response.cast.author.display_name || "anon",
                username: response.cast.author.username,
            },
            timestamp: new Date(response.cast.timestamp),
        };

        this.cache.set(`farcaster/cast/${castHash}`, cast);

        return cast;
    }

    async getCastsByFid(request: FidRequest): Promise<Cast[]> {
        const timeline: Cast[] = [];

        const response = await this.neynar.fetchCastsForUser({
            fid: request.fid,
            limit: request.pageSize,
        });
        //console.log(response);
        response.casts.map((cast) => {
            this.cache.set(`farcaster/cast/${cast.hash}`, cast);
            timeline.push({
                hash: cast.hash,
                //parentHash: cast.parent_hash,
                authorFid: cast.author.fid,
                text: cast.text,
                profile: {
                    fid: cast.author.fid,
                    name: cast.author.display_name || "anon",
                    username: cast.author.username,
                },
                timestamp: new Date(cast.timestamp),
            });
        });

        return timeline;
    }

    async getMentions(request: FidRequest): Promise<Cast[]> {
        const neynarMentionsResponse = await this.neynar.fetchAllNotifications({
            fid: request.fid,
            type: ["mentions", "replies"],
        });
        const mentions: Cast[] = [];

        neynarMentionsResponse.notifications.map((notification) => {
            const cast = {
                hash: notification.cast!.hash,
                authorFid: notification.cast!.author.fid,
                text: notification.cast!.text,
                profile: {
                    fid: notification.cast!.author.fid,
                    name: notification.cast!.author.display_name || "anon",
                    username: notification.cast!.author.username,
                },
                timestamp: new Date(notification.cast!.timestamp),
            };
            mentions.push(cast);
            this.cache.set(`farcaster/cast/${cast.hash}`, cast);
        });

        return mentions;
    }

    async getProfile(fid: number): Promise<Profile> {
        if (this.cache.has(`farcaster/profile/${fid}`)) {
            return this.cache.get(`farcaster/profile/${fid}`) as Profile;
        }

        const result = await this.neynar.fetchBulkUsers({ fids: [fid] });
        //console.log(result)
        if (!result.users || result.users.length < 1) {
            console.log("getUserDataByFid ERROR");

            throw "getUserDataByFid ERROR";
        }

        const neynarUserProfile = result.users[0];

        const profile: Profile = {
            fid,
            name: "",
            username: "",
        };

        const userDataBodyType = {
            1: "pfp",
            2: "name",
            3: "bio",
            5: "url",
            6: "username",
            // 7: "location",
            // 8: "twitter",
            // 9: "github",
        } as const;

        profile.name = neynarUserProfile.display_name!;
        profile.username = neynarUserProfile.username;
        profile.bio = neynarUserProfile.profile.bio.text;
        profile.pfp = neynarUserProfile.pfp_url;

        this.cache.set(`farcaster/profile/${fid}`, profile);

        return profile;
    }

    async getTimeline(request: FidRequest): Promise<{
        timeline: Cast[];
        nextPageToken?: Uint8Array | undefined;
    }> {
        const timeline: Cast[] = [];

        const results = await this.getCastsByFid(request);

        for (const cast of results) {
            this.cache.set(`farcaster/cast/${cast.hash}`, cast);
            timeline.push(cast);
        }

        return {
            timeline,
            //TODO implement out paging
            //nextPageToken: results.nextPageToken,
        };
    }
}
