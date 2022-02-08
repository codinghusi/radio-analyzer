export interface Playlist {
    tracks: {
        time: Date,
        title: string
    }[]
}

export interface Stats {
    moderators: string[],
    broadcastTitle: string
}