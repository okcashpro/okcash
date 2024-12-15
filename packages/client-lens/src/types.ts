export type Profile = {
    id: string;
    profileId: string;
    name?: string | null;
    handle?: string;
    pfp?: string;
    bio?: string | null;
    url?: string;
};

export type BroadcastResult = {
    id?: string;
    txId?: string;
};
