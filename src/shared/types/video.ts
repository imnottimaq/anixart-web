export type VideoStreamType = 'application/x-mpegURL' | 'video/mp4' | string;

export interface VideoStream {
    src: string;
    type: VideoStreamType;
}

export type VideoSources = Record<string, VideoStream[]>;