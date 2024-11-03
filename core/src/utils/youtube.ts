import youtubeDl from 'youtube-dl-exec';

export const youtube = (url: string, options?: any) => youtubeDl(url, options);