
export interface Channel {
  id: string;
  name: string;
  logo: string;
  url: string;
  epg_id: string;
  network?: string;
  category: 'New Zealand' | 'International' | 'Religious' | 'Sports' | 'News';
  headers?: { [key: string]: string };
}

export interface Programme {
  channelId: string;
  start: Date;
  stop: Date;
  title: string;
  description: string;
  rating?: string;
  // New fields from EPG
  icon?: string;
  categories?: string[];
  date?: string;
  episodeNum?: string;
  isNew?: boolean;
  actors?: string[];
  // Extended EPG fields
  country?: string;
  videoQuality?: string;
  audio?: string;
  subtitles?: string;
  starRating?: string;
}

export type EpgData = Map<string, Programme[]>;